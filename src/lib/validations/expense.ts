// 支出バリデーションスキーマ

import { z } from "zod"

/** 支出の visibility 値 */
export const visibilitySchema = z.enum(["PUBLIC", "AMOUNT_ONLY", "CATEGORY_TOTAL"])

/** 基本スキーマ（default なし） — 更新スキーマの partial() 用 */
const expenseBaseSchema = z.object({
  date: z.coerce.date(),
  amount: z.number().int().positive(),
  description: z.string().trim().min(1).max(200),
  categoryId: z.string().cuid().nullable().optional(),
  visibility: visibilitySchema,
  isSubstitute: z.boolean(),
  actualAmount: z.number().int().positive().nullable().optional(),
  memo: z.string().trim().max(1000).nullable().optional(),
})

/** 支出作成用スキーマ（default 付き） */
export const expenseCreateSchema = expenseBaseSchema.extend({
  visibility: visibilitySchema.default("PUBLIC"),
  isSubstitute: z.boolean().default(false),
})

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>

/** 支出更新用スキーマ（全フィールド任意、default なし） */
export const expenseUpdateSchema = expenseBaseSchema.partial()

export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>
