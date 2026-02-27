// 環境変数バリデーションスキーマ（Zod）
// テストから直接importできるよう、モジュール評価時の副作用なし

import { z } from "zod"

// .env.example のデフォルト値など、本番で使うべきでないプレースホルダー（部分一致で検知）
const PLACEHOLDER_PATTERNS = [
  "replace-with",
  "changeme",
  "your-secret",
  "dummy-secret",
  "placeholder",
]

export const envSchema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL が設定されていません" })
    .min(1, "DATABASE_URL が空です")
    .refine(
      (v) => /^file:.+/.test(v),
      "DATABASE_URL は 'file:' で始まり、パスを含む必要があります（例: file:./prisma/dev.db）"
    ),

  AUTH_SECRET: z
    .string({ error: "AUTH_SECRET が設定されていません" })
    .refine(
      (v) => v === v.trim(),
      "AUTH_SECRET に前後の空白が含まれています。空白を除去してください"
    )
    .refine(
      (v) => v.length >= 32,
      "AUTH_SECRET は最低32文字必要です（生成例: openssl rand -base64 32）"
    )
    .refine(
      (v) => {
        const lower = v.toLowerCase()
        return !PLACEHOLDER_PATTERNS.some((p) => lower.includes(p))
      },
      "AUTH_SECRET にプレースホルダー文字列が使われています。安全なランダム値に変更してください（例: openssl rand -base64 32）"
    ),

  AUTH_URL: z
    .string({ error: "AUTH_URL が設定されていません" })
    .url("AUTH_URL は有効なURL形式である必要があります（例: http://localhost:3000）"),
})

export type Env = z.infer<typeof envSchema>

/**
 * 環境変数を検証する
 * テスト用に引数で上書き可能。nodeEnv を指定すると本番向けの追加検証を実行する
 */
export function validateEnv(
  raw: Record<string, string | undefined> = process.env,
  nodeEnv: string = process.env.NODE_ENV ?? "development"
): Env {
  const result = envSchema.safeParse({
    DATABASE_URL: raw.DATABASE_URL,
    // NEXTAUTH_SECRET / NEXTAUTH_URL からのフォールバックを許容
    AUTH_SECRET: raw.AUTH_SECRET ?? raw.NEXTAUTH_SECRET,
    AUTH_URL: raw.AUTH_URL ?? raw.NEXTAUTH_URL,
  })

  if (!result.success) {
    throw new Error(
      `\n❌ 環境変数の設定に問題があります:\n\n${z.prettifyError(result.error)}\n\n.env ファイルを確認してください。\n`
    )
  }

  // 本番環境では AUTH_URL に https を強制（ビルドフェーズは除外）
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build"
  if (nodeEnv === "production" && !isBuildPhase && !result.data.AUTH_URL.startsWith("https://")) {
    throw new Error(
      "\n❌ 環境変数の設定に問題があります:\n\n  AUTH_URL: 本番環境では https:// で始まる必要があります\n\n.env ファイルを確認してください。\n"
    )
  }

  return result.data
}
