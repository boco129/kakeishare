// Phase 4: AI連携モジュール公開エントリポイント

// 設定・境界ガード
export { getAnthropicApiKeyOrThrow, isAIAvailable, AI_NOT_CONFIGURED } from "./config"

// 型定義
export type {
  AIConfidence,
  AICategoryResult,
  AICategoryInput,
  AICategoryRawOutput,
  AIReportInput,
  AIInsightsInput,
  AISuggestionItem,
  AIForecastCategoryItem,
  AIInsightsOutput,
} from "./types"

// Zodバリデーション
export {
  aiConfidenceSchema,
  aiCategoryOutputSchema,
  aiCategoryBatchOutputSchema,
  aiSuggestionItemSchema,
  aiForecastCategoryItemSchema,
  aiInsightsOutputSchema,
  type AICategoryOutput,
  type AICategoryBatchOutput,
  type AIInsightsOutputParsed,
} from "./schemas"

// クライアント
export { getAnthropicClient, getAnthropicClientSingleton, AI_MODELS } from "./client"

// カテゴリ名→ID解決
export {
  normalizeCategoryName,
  resolveCategoryId,
  type CategoryForResolver,
  type CategoryResolveResult,
} from "./category-resolver"

// プロンプトテンプレート
export {
  PROMPT_VERSIONS,
  MAX_CLASSIFICATION_BATCH_SIZE,
  buildCategorySystemPrompt,
  buildCategoryUserMessage,
  buildReportSystemPrompt,
  buildReportUserMessage,
  buildChatSystemPrompt,
  buildChatUserMessage,
  buildInsightsSystemPrompt,
  buildInsightsUserMessage,
} from "./prompts"

// バッチ分類 — db をトップレベルで参照するため barrel export に含めない
// 直接 import する: import { classifyExpenses } from "@/lib/ai/classify"

// チャットコンテキスト生成
export { buildChatContext } from "./build-chat-context"

// チャットレート制限
export { consumeChatRateLimit, resetChatRateLimitStore } from "./chat-rate-limit"

// 利用ログ
export { logTokenUsage, type AIUsageLogEntry } from "./usage-logger"
