// Phase 4: AI利用ログ・コスト管理
// token使用量を構造化ログで出力する

/** Anthropic APIレスポンスのusageフィールド型 */
type TokenUsage = {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

/** ログエントリの型（将来的にDB保存可能な構造） */
export type AIUsageLogEntry = {
  action: string
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  totalTokens: number
  timestamp: string
}

/**
 * token使用量をログ出力する
 * 将来的にDB保存に切り替え可能な構造
 */
export function logTokenUsage(
  action: string,
  usage?: TokenUsage
): AIUsageLogEntry | null {
  if (!usage) return null

  const entry: AIUsageLogEntry = {
    action,
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    totalTokens:
      (usage.input_tokens ?? 0) +
      (usage.output_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0),
    timestamp: new Date().toISOString(),
  }

  console.info("[ai.usage]", entry)

  return entry
}
