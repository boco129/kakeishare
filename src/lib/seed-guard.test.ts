// src/lib/seed-guard.test.ts
// Issue #24: seedスクリプト本番保護ガードの単体テスト

import { mkdtempSync, symlinkSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, beforeAll, afterAll } from "vitest"
import { assertSafeToSeed } from "../../prisma/seed-guard"

describe("assertSafeToSeed", () => {
  // === DATABASE_URL 検査（allowlist方式 + パス正規化） ===
  describe("DATABASE_URL検査", () => {
    it("postgresql:// で始まる場合にエラー", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "postgresql://localhost:5432/mydb" },
          argv: ["node", "seed.ts"],
        })
      ).toThrow("file:スキーム")
    })

    it("postgres:// で始まる場合にエラー", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "postgres://user:pass@host/db" },
          argv: ["node", "seed.ts"],
        })
      ).toThrow("file:スキーム")
    })

    it("大文字スキーム PostgreSQL:// でもエラー", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "PostgreSQL://localhost/db" },
          argv: ["node", "seed.ts"],
        })
      ).toThrow("file:スキーム")
    })

    it("mysql:// で始まる場合にエラー", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "mysql://localhost/db" },
          argv: ["node", "seed.ts"],
        })
      ).toThrow("file:スキーム")
    })

    it("prisma+postgres:// で始まる場合にエラー", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "prisma+postgres://accelerate.prisma-data.net" },
          argv: ["node", "seed.ts"],
        })
      ).toThrow("file:スキーム")
    })

    it("先頭空白付き postgresql:// でもエラー", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: " postgresql://localhost/db" },
          argv: ["node", "seed.ts"],
        })
      ).toThrow("file:スキーム")
    })

    it("本番風SQLite file:/var/app/prod.db でもエラー", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "file:/var/app/prod.db" },
          argv: ["node", "seed.ts"],
        })
      ).toThrow("許可されたローカル SQLite パス以外")
    })

    it("パストラバーサル file:/tmp/../var/app/prod.db は拒否", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "file:/tmp/../var/app/prod.db" },
          argv: ["node", "seed.ts"],
        })
      ).toThrow("許可されたローカル SQLite パス以外")
    })

    it("DATABASE_URL が空文字の場合にエラー", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "" },
          argv: ["node", "seed.ts"],
        })
      ).toThrow("DATABASE_URL が空です")
    })

    it("DATABASE_URL が空白のみの場合にエラー", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "  " },
          argv: ["node", "seed.ts"],
        })
      ).toThrow("DATABASE_URL が空です")
    })

    it("許可済みSQLite URL (file:./prisma/dev.db) なら正常", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "file:./prisma/dev.db" },
          argv: ["node", "seed.ts"],
        })
      ).not.toThrow()
    })

    it("一時ディレクトリのSQLite (file:/tmp/...) なら正常", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "file:/tmp/test-seed/test.db" },
          argv: ["node", "seed.ts"],
        })
      ).not.toThrow()
    })

    it("macOS一時ディレクトリ (file:/var/folders/...) なら正常", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "file:/var/folders/xx/yy/T/test.db" },
          argv: ["node", "seed.ts"],
        })
      ).not.toThrow()
    })

    it("DATABASE_URL未設定ならデフォルトSQLiteで正常", () => {
      expect(() =>
        assertSafeToSeed({
          env: {},
          argv: ["node", "seed.ts"],
        })
      ).not.toThrow()
    })
  })

  // === NODE_ENV 検査 ===
  describe("NODE_ENV検査", () => {
    it("NODE_ENV=production でエラー", () => {
      expect(() =>
        assertSafeToSeed({
          env: { NODE_ENV: "production", DATABASE_URL: "file:./prisma/dev.db" },
          argv: ["node", "seed.ts"],
        })
      ).toThrow("NODE_ENV が production に設定されています")
    })

    it("NODE_ENV=Production（大文字混在）でもエラー", () => {
      expect(() =>
        assertSafeToSeed({
          env: { NODE_ENV: "Production", DATABASE_URL: "file:./prisma/dev.db" },
          argv: ["node", "seed.ts"],
        })
      ).toThrow("NODE_ENV が production に設定されています")
    })

    it("NODE_ENV='production '（末尾空白）でもエラー", () => {
      expect(() =>
        assertSafeToSeed({
          env: { NODE_ENV: "production ", DATABASE_URL: "file:./prisma/dev.db" },
          argv: ["node", "seed.ts"],
        })
      ).toThrow("NODE_ENV が production に設定されています")
    })

    it("NODE_ENV=development なら正常", () => {
      expect(() =>
        assertSafeToSeed({
          env: { NODE_ENV: "development", DATABASE_URL: "file:./prisma/dev.db" },
          argv: ["node", "seed.ts"],
        })
      ).not.toThrow()
    })

    it("NODE_ENV未設定なら正常", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "file:./prisma/dev.db" },
          argv: ["node", "seed.ts"],
        })
      ).not.toThrow()
    })
  })

  // === --force フラグ ===
  describe("--forceフラグ", () => {
    it("--force指定でPostgreSQLでも正常", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "postgresql://localhost/db" },
          argv: ["node", "seed.ts", "--force"],
        })
      ).not.toThrow()
    })

    it("--force指定でNODE_ENV=productionでも正常", () => {
      expect(() =>
        assertSafeToSeed({
          env: { NODE_ENV: "production", DATABASE_URL: "file:./prisma/dev.db" },
          argv: ["node", "seed.ts", "--force"],
        })
      ).not.toThrow()
    })

    it("--force指定でPostgreSQL + production両方でも正常", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "postgresql://localhost/db", NODE_ENV: "production" },
          argv: ["node", "seed.ts", "--force"],
        })
      ).not.toThrow()
    })

    it("--force指定でも空URLは拒否", () => {
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: "   " },
          argv: ["node", "seed.ts", "--force"],
        })
      ).toThrow("DATABASE_URL が空です")
    })
  })

  // === 戻り値（検証済みURL） ===
  describe("戻り値", () => {
    it("検証済みURLを返す", () => {
      const result = assertSafeToSeed({
        env: { DATABASE_URL: "file:./prisma/dev.db" },
        argv: ["node", "seed.ts"],
      })
      expect(result).toBe("file:./prisma/dev.db")
    })

    it("前後空白をtrimしたURLを返す", () => {
      const result = assertSafeToSeed({
        env: { DATABASE_URL: " file:./prisma/dev.db " },
        argv: ["node", "seed.ts"],
      })
      expect(result).toBe("file:./prisma/dev.db")
    })

    it("--force時もtrim済みURLを返す", () => {
      const result = assertSafeToSeed({
        env: { DATABASE_URL: " postgresql://localhost/db " },
        argv: ["node", "seed.ts", "--force"],
      })
      expect(result).toBe("postgresql://localhost/db")
    })
  })

  // === symlink対策 ===
  describe("symlink対策", () => {
    let tmpDir: string
    let symlinkPath: string

    beforeAll(() => {
      // /tmp配下にsymlinkを作成: /tmp/xxx/link.db → CWD/prisma/dev.db（allow対象外の実体）
      tmpDir = mkdtempSync(join(tmpdir(), "seed-guard-symlink-"))
      const targetFile = join(tmpDir, "target.db")
      writeFileSync(targetFile, "")
      symlinkPath = join(tmpDir, "link.db")
      symlinkSync(targetFile, symlinkPath)
    })

    afterAll(() => {
      rmSync(tmpDir, { recursive: true, force: true })
    })

    it("allow内のsymlinkがallow内の実体を指す場合は正常", () => {
      // /tmp/xxx/link.db → /tmp/xxx/target.db（両方/tmp配下）
      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: `file:${symlinkPath}` },
          argv: ["node", "seed.ts"],
        })
      ).not.toThrow()
    })

    it("allow内symlinkがallow外実体を指す場合は拒否", () => {
      // /tmp/xxx/escape.db → CWD/README.md（/tmp外の実体）
      const outsideTarget = join(process.cwd(), "README.md")
      const escapeLink = join(tmpDir, "escape.db")
      symlinkSync(outsideTarget, escapeLink)

      expect(() =>
        assertSafeToSeed({
          env: { DATABASE_URL: `file:${escapeLink}` },
          argv: ["node", "seed.ts"],
        })
      ).toThrow("許可されたローカル SQLite パス以外")
    })
  })

  // === エラーメッセージ検証 ===
  describe("エラーメッセージ", () => {
    it("エラーメッセージに接続文字列を含まない", () => {
      try {
        assertSafeToSeed({
          env: { DATABASE_URL: "postgresql://user:secret@prod-host/db" },
          argv: ["node", "seed.ts"],
        })
        expect.fail("エラーがスローされるべき")
      } catch (e) {
        const message = (e as Error).message
        expect(message).not.toContain("secret")
        expect(message).not.toContain("prod-host")
        expect(message).toContain("--force")
      }
    })
  })
})
