// prisma/seed-guard.ts — 本番DB保護ガード
// seed実行前にDATABASE_URLとNODE_ENVを検査し、本番環境での誤実行を防止する
// allowlist方式: 許可されたSQLite パスのみ通過、パストラバーサル・symlink対策済み

import fs from "node:fs"
import path from "node:path"

const DEFAULT_DB_URL = "file:./prisma/dev.db"

// 完全一致で許可する正規化済みパス（CWD相対で解決）
const ALLOWED_EXACT_PATHS = new Set([
  path.resolve("./prisma/dev.db"),
  path.resolve("./prisma/e2e.db"), // GitHub Actions E2E用
])

// プレフィックス一致で許可する正規化済みパス（テスト用一時DB等）
const ALLOWED_PREFIX_PATHS = [
  "/tmp/",
  "/private/tmp/", // macOSでは /tmp → /private/tmp のsymlink
  "/var/folders/",
  "/private/var/folders/", // macOSでの実体パス
]

type GuardOptions = {
  env?: NodeJS.ProcessEnv
  argv?: string[]
  defaultDatabaseUrl?: string
}

/**
 * file: URLからファイルパスを抽出し、path.resolveで正規化する。
 * file:スキーム以外はエラーをスローする。
 */
function toNormalizedFilePath(databaseUrl: string): string {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error(
      "本番 DB への seed は禁止されています。許可されたローカル SQLite URL（file:スキーム）以外への seed は実行できません。強制実行するには --force フラグを使用してください。"
    )
  }
  // file: プレフィックスを除去してパスを取得
  const rawPath = databaseUrl.slice("file:".length)
  // path.resolveで ../ を解決し絶対パスに正規化
  return path.resolve(rawPath)
}

/**
 * 正規化済みパスをsymlink解決して実体パスを返す。
 * ファイルが存在しない場合は親ディレクトリのsymlinkを解決する。
 */
function toCanonicalPath(normalizedPath: string): string {
  try {
    // 既存ファイルは実体パスで判定（symlink解決）
    return fs.realpathSync(normalizedPath)
  } catch {
    // 新規作成DB（ファイル未存在）は親ディレクトリだけsymlink解決して判定
    try {
      const dir = fs.realpathSync(path.dirname(normalizedPath))
      return path.join(dir, path.basename(normalizedPath))
    } catch {
      // 親ディレクトリも存在しない場合はnormalizedPathをそのまま使用
      return normalizedPath
    }
  }
}

/**
 * seed実行が安全かどうかを検証し、検証済みのDATABASE_URLを返す。
 * 許可されたSQLiteパス以外、またはNODE_ENV=productionの場合はエラーをスローする。
 * --forceフラグで明示的にバイパス可能。
 *
 * @returns trim済みの検証済みDATABASE_URL
 */
export function assertSafeToSeed(options: GuardOptions = {}): string {
  const env = options.env ?? process.env
  const argv = options.argv ?? process.argv
  const defaultDatabaseUrl = options.defaultDatabaseUrl ?? DEFAULT_DB_URL

  const databaseUrl = (env.DATABASE_URL ?? defaultDatabaseUrl).trim()

  // 空値チェックは--forceでもバイパスしない
  if (!databaseUrl) {
    throw new Error(
      "seed 実行を中止しました。DATABASE_URL が空です。"
    )
  }

  if (argv.includes("--force")) return databaseUrl

  const nodeEnv = (env.NODE_ENV ?? "").trim().toLowerCase()

  if (nodeEnv === "production") {
    throw new Error(
      "本番 DB への seed は禁止されています。NODE_ENV が production に設定されています。強制実行するには --force フラグを使用してください。"
    )
  }

  // パス正規化 → symlink解決してallowlist判定
  const normalizedPath = toNormalizedFilePath(databaseUrl)
  const canonicalPath = toCanonicalPath(normalizedPath)
  const isAllowed =
    ALLOWED_EXACT_PATHS.has(canonicalPath) ||
    ALLOWED_PREFIX_PATHS.some((prefix) => canonicalPath.startsWith(prefix))

  if (!isAllowed) {
    throw new Error(
      "本番 DB への seed は禁止されています。許可されたローカル SQLite パス以外への seed は実行できません。強制実行するには --force フラグを使用してください。"
    )
  }

  return databaseUrl
}
