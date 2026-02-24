// カテゴリバリデーションスキーマ

import { z } from "zod"
import { visibilitySchema } from "./expense"

/** カテゴリ基本スキーマ（default なし） — 更新スキーマの partial() 用 */
const categoryBaseSchema = z.object({
  name: z.string().trim().min(1, "カテゴリ名は必須です").max(30),
  icon: z.string().trim().min(1).max(8),
  isFixedCost: z.boolean(),
  defaultVisibility: visibilitySchema,
})

/** カテゴリ作成用スキーマ（default 付き） */
export const categoryCreateSchema = categoryBaseSchema.extend({
  icon: z.string().trim().min(1).max(8).default("📦"),
  isFixedCost: z.boolean().default(false),
  defaultVisibility: visibilitySchema.default("PUBLIC"),
})

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>

/** カテゴリ更新用スキーマ（PATCH用、全フィールド任意、sortOrderは含まない） */
export const categoryUpdateSchema = categoryBaseSchema.partial()

export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>

/** カテゴリ公開レベル更新用スキーマ（ユーザー別） */
export const categoryVisibilityUpdateSchema = z.object({
  visibility: visibilitySchema,
})

export type CategoryVisibilityUpdateInput = z.infer<typeof categoryVisibilityUpdateSchema>

/** カテゴリ並び替え用スキーマ */
export const categoryReorderSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "カテゴリIDが必要です"),
})

export type CategoryReorderInput = z.infer<typeof categoryReorderSchema>
