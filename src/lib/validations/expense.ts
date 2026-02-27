// 支出バリデーションスキーマ

import { z } from "zod"
import { yearMonthSchema } from "./year-month"

/** 支出の visibility 値 */
export const visibilitySchema = z.enum(["PUBLIC", "AMOUNT_ONLY", "CATEGORY_TOTAL"])

/** 基本スキーマ（default なし） — 更新スキーマの partial() 用 */
const expenseBaseSchema = z.object({
  date: z.coerce.date(),
  amount: z.number().int().refine((v) => v !== 0, "金額は0以外で入力してください"),
  description: z.string().trim().min(1).max(200),
  categoryId: z.string().cuid().nullable().optional(),
  visibility: visibilitySchema,
  isSubstitute: z.boolean(),
  actualAmount: z.number().int().positive().nullable().optional(),
  memo: z.string().trim().max(1000).nullable().optional(),
})

/** 支出作成用スキーマ — visibility は optional（サーバー側で自動解決） */
export const expenseCreateSchema = expenseBaseSchema.extend({
  visibility: visibilitySchema.optional(),
  isSubstitute: z.boolean().default(false),
})

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>

/** 支出更新用スキーマ（全フィールド任意、default なし） */
export const expenseUpdateSchema = expenseBaseSchema.partial()

export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>

/** ソート対象カラム */
export const sortBySchema = z.enum(["date", "amount"]).default("date")

/** ソート順 */
export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc")

/** 支出一覧取得用クエリパラメータスキーマ */
export const expenseListQuerySchema = z.object({
  yearMonth: yearMonthSchema.optional(),
  categoryId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  sortBy: sortBySchema.optional(),
  sortOrder: sortOrderSchema.optional(),
})
