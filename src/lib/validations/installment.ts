// 分割払いバリデーションスキーマ

import { z } from "zod"
import { visibilitySchema } from "./expense"

/** 分割払い作成用スキーマ */
export const installmentCreateSchema = z.object({
  description: z.string().trim().min(1).max(200),
  totalAmount: z.number().int().nonnegative("総額は0以上で入力してください"),
  monthlyAmount: z.number().int().nonnegative("月額は0以上で入力してください"),
  totalMonths: z.number().int().positive("分割回数は1以上で入力してください"),
  remainingMonths: z.number().int().nonnegative("残回数は0以上で入力してください"),
  startDate: z.coerce.date(),
  visibility: visibilitySchema.optional(),
  fee: z.number().int().nonnegative("手数料は0以上で入力してください").default(0),
}).refine(
  (data) => data.remainingMonths <= data.totalMonths,
  { message: "残回数は分割回数以下で入力してください", path: ["remainingMonths"] },
)

export type InstallmentCreateInput = z.infer<typeof installmentCreateSchema>

/** 分割払い更新用スキーマ — 両方指定時は remainingMonths <= totalMonths を検証 */
export const installmentUpdateSchema = z.object({
  description: z.string().trim().min(1).max(200).optional(),
  totalAmount: z.number().int().nonnegative("総額は0以上で入力してください").optional(),
  monthlyAmount: z.number().int().nonnegative("月額は0以上で入力してください").optional(),
  totalMonths: z.number().int().positive("分割回数は1以上で入力してください").optional(),
  remainingMonths: z.number().int().nonnegative("残回数は0以上で入力してください").optional(),
  startDate: z.coerce.date().optional(),
  visibility: visibilitySchema.optional(),
  fee: z.number().int().nonnegative("手数料は0以上で入力してください").optional(),
}).superRefine((data, ctx) => {
  if (
    data.totalMonths !== undefined &&
    data.remainingMonths !== undefined &&
    data.remainingMonths > data.totalMonths
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["remainingMonths"],
      message: "残回数は分割回数以下で入力してください",
    })
  }
})

export type InstallmentUpdateInput = z.infer<typeof installmentUpdateSchema>
