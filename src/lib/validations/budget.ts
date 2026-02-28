// 予算バリデーションスキーマ

import { z } from "zod"
import { yearMonthSchema } from "./year-month"

/** 予算作成（upsert）用スキーマ */
export const budgetCreateSchema = z.object({
  yearMonth: yearMonthSchema,
  categoryId: z.string().min(1).nullable().optional(),
  amount: z.number().int().nonnegative("予算金額は0以上で入力してください"),
})

export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>

/** 予算金額更新用スキーマ（PATCH用 — amountのみ） */
export const budgetPatchSchema = z.object({
  amount: z.number().int().nonnegative("予算金額は0以上で入力してください"),
})

export type BudgetPatchInput = z.infer<typeof budgetPatchSchema>

/** 予算一覧取得用クエリスキーマ */
export const budgetListQuerySchema = z.object({
  yearMonth: yearMonthSchema,
})
