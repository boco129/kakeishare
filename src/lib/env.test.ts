import { describe, expect, it } from "vitest"
import { validateEnv } from "@/lib/env-schema"

// テスト用の有効な環境変数ベースライン
const validEnv = {
  DATABASE_URL: "file:./prisma/dev.db",
  AUTH_SECRET: "a]9Kx#mP2$vL8nQ5wR1tY6uI3oA0sD7f",
  AUTH_URL: "http://localhost:3000",
}

describe("validateEnv", () => {
  // --- DATABASE_URL ---
  describe("DATABASE_URL", () => {
    it("未設定の場合にエラー", () => {
      const env = { ...validEnv, DATABASE_URL: undefined }
      expect(() => validateEnv(env)).toThrow()
    })

    it("空文字の場合にエラー", () => {
      const env = { ...validEnv, DATABASE_URL: "" }
      expect(() => validateEnv(env)).toThrow()
    })

    it("file: 以外のプレフィックスでエラー", () => {
      const env = { ...validEnv, DATABASE_URL: "mysql://localhost/db" }
      expect(() => validateEnv(env)).toThrow(/file:/)
    })

    it("postgresql:// でもエラー（現在SQLiteのみ対応）", () => {
      const env = { ...validEnv, DATABASE_URL: "postgresql://localhost/db" }
      expect(() => validateEnv(env)).toThrow(/file:/)
    })

    it("file: のみでパスなしの場合にエラー", () => {
      const env = { ...validEnv, DATABASE_URL: "file:" }
      expect(() => validateEnv(env)).toThrow(/パス/)
    })

    it("file: で始まりパスを含む有効な値は通る", () => {
      expect(() => validateEnv(validEnv)).not.toThrow()
    })
  })

  // --- AUTH_SECRET ---
  describe("AUTH_SECRET", () => {
    it("未設定の場合にエラー", () => {
      const env = { ...validEnv, AUTH_SECRET: undefined }
      expect(() => validateEnv(env)).toThrow()
    })

    it("32文字未満の場合にエラー", () => {
      const env = { ...validEnv, AUTH_SECRET: "short" }
      expect(() => validateEnv(env)).toThrow(/32/)
    })

    it("プレースホルダー文字列（完全一致）でエラー", () => {
      const env = {
        ...validEnv,
        AUTH_SECRET: "replace-with-long-random-secret",
      }
      expect(() => validateEnv(env)).toThrow(/プレースホルダー/)
    })

    it("プレースホルダーを含む文字列（部分一致）でもエラー", () => {
      const env = {
        ...validEnv,
        AUTH_SECRET: "CHANGEME".padEnd(32, "x") + "extra-padding-here",
      }
      expect(() => validateEnv(env)).toThrow(/プレースホルダー/)
    })

    it("前後に空白がある場合にエラー", () => {
      const env = {
        ...validEnv,
        AUTH_SECRET: "  " + validEnv.AUTH_SECRET + "  ",
      }
      expect(() => validateEnv(env)).toThrow(/空白/)
    })

    it("NEXTAUTH_SECRET からフォールバックする", () => {
      const env = {
        DATABASE_URL: validEnv.DATABASE_URL,
        NEXTAUTH_SECRET: validEnv.AUTH_SECRET,
      }
      expect(() => validateEnv(env)).not.toThrow()
    })

    it("AUTH_SECRET と NEXTAUTH_SECRET が両方ある場合は AUTH_SECRET を優先", () => {
      const env = {
        ...validEnv,
        AUTH_SECRET: validEnv.AUTH_SECRET,
        NEXTAUTH_SECRET: "this-should-not-be-used-at-all!!",
      }
      const result = validateEnv(env)
      expect(result.AUTH_SECRET).toBe(validEnv.AUTH_SECRET)
    })
  })

  // --- AUTH_URL ---
  describe("AUTH_URL", () => {
    it("未設定でも開発環境ではエラーにならない", () => {
      const env = { ...validEnv, AUTH_URL: undefined }
      expect(() => validateEnv(env)).not.toThrow()
    })

    it("不正なURL形式でエラー", () => {
      const env = { ...validEnv, AUTH_URL: "not-a-url" }
      expect(() => validateEnv(env)).toThrow()
    })

    it("NEXTAUTH_URL からフォールバックする", () => {
      const env = {
        DATABASE_URL: validEnv.DATABASE_URL,
        AUTH_SECRET: validEnv.AUTH_SECRET,
        NEXTAUTH_URL: "http://localhost:3000",
      }
      expect(() => validateEnv(env)).not.toThrow()
    })

    it("有効なURLは通る", () => {
      expect(() => validateEnv(validEnv)).not.toThrow()
    })

    it("production で未設定の場合にエラー", () => {
      const env = { ...validEnv, AUTH_URL: undefined }
      expect(() => validateEnv(env, "production")).toThrow(/AUTH_URL/)
    })

    it("production では http:// でエラー", () => {
      expect(() => validateEnv(validEnv, "production")).toThrow(/https/)
    })

    it("production では https:// が通る", () => {
      const env = { ...validEnv, AUTH_URL: "https://kakeishare.example.com" }
      expect(() => validateEnv(env, "production")).not.toThrow()
    })
  })

  // --- 正常系 ---
  describe("正常系", () => {
    it("全て有効な場合にパースされた値を返す", () => {
      const result = validateEnv(validEnv)
      expect(result).toEqual({
        DATABASE_URL: validEnv.DATABASE_URL,
        AUTH_SECRET: validEnv.AUTH_SECRET,
        AUTH_URL: validEnv.AUTH_URL,
      })
    })

    it("AUTH_URL未設定の場合はundefinedを返す", () => {
      const env = { ...validEnv, AUTH_URL: undefined }
      const result = validateEnv(env)
      expect(result.AUTH_URL).toBeUndefined()
    })
  })
})
