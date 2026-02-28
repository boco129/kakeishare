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
} from "./types"

// Zodバリデーション
export {
  aiConfidenceSchema,
  aiCategoryOutputSchema,
  aiCategoryBatchOutputSchema,
  type AICategoryOutput,
  type AICategoryBatchOutput,
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
} from "./prompts"

// 利用ログ
export { logTokenUsage, type AIUsageLogEntry } from "./usage-logger"
