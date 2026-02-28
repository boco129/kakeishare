// Phase 4: Claude API出力のZodバリデーションスキーマ
// LLMの出力揺れ（JSON崩れ、カテゴリ名ブレ等）を検知するための契約定義

import { z } from "zod"

/** AI分類の確信度 */
export const aiConfidenceSchema = z.enum(["high", "medium", "low"])

/** Claude APIからのカテゴリ分類レスポンス（1件分） */
export const aiCategoryOutputSchema = z.object({
  category: z.string().trim().min(1, "カテゴリ名が空です"),
  confidence: aiConfidenceSchema,
  reasoning: z.string().optional(),
})

/** Claude APIからのバッチ分類レスポンス */
export const aiCategoryBatchOutputSchema = z.array(aiCategoryOutputSchema)

export type AICategoryOutput = z.infer<typeof aiCategoryOutputSchema>
export type AICategoryBatchOutput = z.infer<typeof aiCategoryBatchOutputSchema>
