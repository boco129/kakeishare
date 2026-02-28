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

/** 削減提案1件のスキーマ */
export const aiSuggestionItemSchema = z
  .object({
    category: z.string().trim().min(1),
    currentAverage: z.number().int().nonnegative(),
    targetAmount: z.number().int().nonnegative(),
    savingAmount: z.number().int().nonnegative(),
    description: z.string().trim().min(1),
    priority: z.enum(["high", "medium", "low"]),
  })
  .superRefine((v, ctx) => {
    if (v.targetAmount > v.currentAverage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "targetAmount は currentAverage 以下である必要があります",
      })
    }
    if (v.savingAmount !== v.currentAverage - v.targetAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "savingAmount は currentAverage - targetAmount と一致する必要があります",
      })
    }
  })

/** カテゴリ別予測1件のスキーマ */
export const aiForecastCategoryItemSchema = z.object({
  category: z.string().trim().min(1),
  predictedAmount: z.number().int().nonnegative(),
  reason: z.string().trim().min(1),
})

/** AI Insights レスポンス全体のスキーマ */
export const aiInsightsOutputSchema = z.object({
  suggestions: z.array(aiSuggestionItemSchema).min(1).max(5),
  forecast: z.object({
    totalPredicted: z.number().int().nonnegative(),
    confidence: aiConfidenceSchema,
    confidenceReason: z.string().trim().min(1),
    categories: z.array(aiForecastCategoryItemSchema).min(1).max(15),
  }),
  summary: z.string().trim().min(10),
})

export type AIInsightsOutputParsed = z.infer<typeof aiInsightsOutputSchema>
