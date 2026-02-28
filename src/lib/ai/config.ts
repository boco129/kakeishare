// Phase 4: AI機能の設定・境界ガード

import type { Env } from "@/lib/env-schema"

/** AI機能が未設定の場合に投げるエラーコード */
export const AI_NOT_CONFIGURED = "AI_NOT_CONFIGURED" as const

/**
 * ANTHROPIC_API_KEY を取得する。未設定の場合はエラーを投げる
 * AI機能を呼び出す入口で必ずこの関数を通すことで、
 * env-schema では optional のままAI実行時のみ必須チェックを行う
 */
export function getAnthropicApiKeyOrThrow(env: Env): string {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      `${AI_NOT_CONFIGURED}: ANTHROPIC_API_KEY が設定されていません。` +
        "AI機能を利用するには .env に ANTHROPIC_API_KEY を設定してください。"
    )
  }
  return env.ANTHROPIC_API_KEY
}

/** AI機能が利用可能かどうかを判定する（エラーを投げない） */
export function isAIAvailable(env: Env): boolean {
  return !!env.ANTHROPIC_API_KEY
}
