// Phase 4: Anthropic SDKクライアントラッパー
// シングルトンパターンでクライアントを管理（Prisma Clientと同じ方式）

import Anthropic from "@anthropic-ai/sdk"
import { getAnthropicApiKeyOrThrow } from "./config"
import type { Env } from "@/lib/env-schema"

declare global {
  var __anthropicByKey: Map<string, Anthropic> | undefined
}

/** モデル定数 — 用途別に使い分ける */
export const AI_MODELS = {
  /** カテゴリ分類: コスト効率重視 */
  CLASSIFICATION: "claude-haiku-4-5" as const,
  /** レポート生成・チャット: 品質重視 */
  REPORT: "claude-sonnet-4-6" as const,
} as const

/** クライアント共通設定 */
const CLIENT_OPTIONS = {
  timeout: 30_000,
  maxRetries: 2,
} as const

function createClient(env: Env): Anthropic {
  return new Anthropic({
    apiKey: getAnthropicApiKeyOrThrow(env),
    timeout: CLIENT_OPTIONS.timeout,
    maxRetries: CLIENT_OPTIONS.maxRetries,
  })
}

/**
 * Anthropic クライアントを取得する（毎回新規生成）
 * テストやワンショット利用向け
 */
export function getAnthropicClient(env: Env): Anthropic {
  return createClient(env)
}

/**
 * シングルトンクライアントを取得する（アプリケーション実行時用）
 * APIキー単位でキャッシュし、開発時のHMRでインスタンスが増殖しないようglobalThisに保持
 */
export function getAnthropicClientSingleton(env: Env): Anthropic {
  const key = getAnthropicApiKeyOrThrow(env)
  globalThis.__anthropicByKey ??= new Map()
  const cached = globalThis.__anthropicByKey.get(key)
  if (cached) return cached
  const client = createClient(env)
  globalThis.__anthropicByKey.set(key, client)
  return client
}
