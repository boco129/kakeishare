// YYYY-MM 形式の共通バリデーションスキーマ

import { z } from "zod"

/** YYYY-MM 形式（01〜12月） */
export const yearMonthSchema = z.string().regex(
  /^\d{4}-(0[1-9]|1[0-2])$/,
  "YYYY-MM形式（01〜12月）で指定してください",
)
