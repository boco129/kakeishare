// CSV取り込みバリデーションスキーマ

import { z } from "zod"
import { yearMonthSchema } from "./year-month"

/** カード種別 */
export const cardTypeSchema = z.enum(["epos", "mufg_jcb", "mufg_visa"])

// yearMonthSchema は year-month.ts から再エクスポート
export { yearMonthSchema }

/** CSV取り込みリクエストのバリデーション */
export const csvImportInputSchema = z.object({
  cardType: cardTypeSchema,
  yearMonth: yearMonthSchema,
  ownerUserId: z.string().min(1, "カード所有者IDは必須です"),
})

export type CsvImportInput = z.infer<typeof csvImportInputSchema>

/** ファイルサイズ上限（5MB） */
export const MAX_FILE_SIZE = 5 * 1024 * 1024

/** 行数上限 */
export const MAX_ROW_COUNT = 5000
