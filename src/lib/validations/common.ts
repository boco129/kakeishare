// API レスポンス共通型・エラーレスポンス規約

import { z } from "zod"

// エラーコード一覧
export const errorCodeSchema = z.enum([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "CONFLICT",
  "INTERNAL_ERROR",
])

export type ErrorCode = z.infer<typeof errorCodeSchema>

// エラーレスポンス
export const apiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
})

export type ApiErrorResponse = z.infer<typeof apiErrorSchema>

// 成功レスポンスビルダー
export const apiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.literal(true),
    data: dataSchema,
    meta: z.record(z.string(), z.unknown()).optional(),
  })
