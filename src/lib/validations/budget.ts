// 予算バリデーションスキーマ

import { z } from "zod"
import { yearMonthSchema } from "./year-month"

/** 予算作成用スキーマ */
export const budgetCreateSchema = z.object({
  yearMonth: yearMonthSchema,
  categoryId: z.string().cuid().nullable().optional(),
  amount: z.number().int().nonnegative("予算金額は0以上で入力してください"),
})

export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>

/** 予算更新用スキーマ */
export const budgetUpdateSchema = budgetCreateSchema.partial()

export type BudgetUpdateInput = z.infer<typeof budgetUpdateSchema>
