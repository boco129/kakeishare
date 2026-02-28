// 分割払い API — 個別取得 / 更新 / 削除

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { installmentUpdateSchema } from "@/lib/validations/installment"

const PRIVATE_LABEL = "個人支出" as const

/** GET /api/installments/[id] — 個別取得（プライバシーフィルター付き） */
export const GET = withApiHandler(async (_request, context) => {
  const { userId } = await requireAuth()

  const { id } = await context.params!
  if (!id || typeof id !== "string") {
    throw new ApiError("VALIDATION_ERROR", "IDが不正です", 400)
  }

  const installment = await db.installment.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true } } },
  })

  if (!installment) {
    throw new ApiError("NOT_FOUND", "分割払いが見つかりません", 404)
  }

  const isOwn = installment.userId === userId
  const remainingAmount = installment.monthlyAmount * installment.remainingMonths
  const progressRate =
    installment.totalMonths > 0
      ? Math.round(
          ((installment.totalMonths - installment.remainingMonths) /
            installment.totalMonths) *
            1000,
        ) / 10
      : 0

  // CATEGORY_TOTAL の相手の分割払い → 404
  if (!isOwn && installment.visibility === "CATEGORY_TOTAL") {
    throw new ApiError("NOT_FOUND", "分割払いが見つかりません", 404)
  }

  const data = {
    id: installment.id,
    userId: installment.userId,
    userName: installment.user?.name ?? null,
    description:
      !isOwn && installment.visibility === "AMOUNT_ONLY"
        ? PRIVATE_LABEL
        : installment.description,
    totalAmount: installment.totalAmount,
    monthlyAmount: installment.monthlyAmount,
    totalMonths: installment.totalMonths,
    remainingMonths: installment.remainingMonths,
    remainingAmount,
    progressRate,
    startDate: installment.startDate,
    visibility: installment.visibility,
    fee: installment.fee,
    createdAt: installment.createdAt,
    updatedAt: installment.updatedAt,
    masked: !isOwn && installment.visibility === "AMOUNT_ONLY",
  }

  return jsonOk(data)
})

/** PATCH /api/installments/[id] — 分割払い更新（所有者のみ） */
export const PATCH = withApiHandler(async (request, context) => {
  const { userId } = await requireAuth()

  const { id } = await context.params!
  if (!id || typeof id !== "string") {
    throw new ApiError("VALIDATION_ERROR", "IDが不正です", 400)
  }

  const existing = await db.installment.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError("NOT_FOUND", "分割払いが見つかりません", 404)
  }

  if (existing.userId !== userId) {
    throw new ApiError("FORBIDDEN", "他人の分割払いは編集できません", 403)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError("VALIDATION_ERROR", "JSON形式が不正です", 400)
  }
  const input = installmentUpdateSchema.parse(body)

  // 既存値とマージ後の整合性チェック（Zod superRefineは両方指定時のみ検証）
  const nextTotalMonths = input.totalMonths ?? existing.totalMonths
  const nextRemainingMonths = input.remainingMonths ?? existing.remainingMonths
  if (nextRemainingMonths > nextTotalMonths) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "残回数は分割回数以下で入力してください",
      400,
    )
  }

  const installment = await db.installment.update({
    where: { id },
    data: {
      ...(input.description !== undefined && { description: input.description }),
      ...(input.totalAmount !== undefined && { totalAmount: input.totalAmount }),
      ...(input.monthlyAmount !== undefined && {
        monthlyAmount: input.monthlyAmount,
      }),
      ...(input.totalMonths !== undefined && { totalMonths: input.totalMonths }),
      ...(input.remainingMonths !== undefined && {
        remainingMonths: input.remainingMonths,
      }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.visibility !== undefined && { visibility: input.visibility }),
      ...(input.fee !== undefined && { fee: input.fee }),
    },
    include: { user: { select: { id: true, name: true } } },
  })

  const remainingAmount = installment.monthlyAmount * installment.remainingMonths
  const progressRate =
    installment.totalMonths > 0
      ? Math.round(
          ((installment.totalMonths - installment.remainingMonths) /
            installment.totalMonths) *
            1000,
        ) / 10
      : 0

  return jsonOk({
    id: installment.id,
    userId: installment.userId,
    userName: installment.user?.name ?? null,
    description: installment.description,
    totalAmount: installment.totalAmount,
    monthlyAmount: installment.monthlyAmount,
    totalMonths: installment.totalMonths,
    remainingMonths: installment.remainingMonths,
    remainingAmount,
    progressRate,
    startDate: installment.startDate,
    visibility: installment.visibility,
    fee: installment.fee,
    createdAt: installment.createdAt,
    updatedAt: installment.updatedAt,
    masked: false,
  })
})

/** DELETE /api/installments/[id] — 分割払い削除（所有者のみ） */
export const DELETE = withApiHandler(async (_request, context) => {
  const { userId } = await requireAuth()

  const { id } = await context.params!
  if (!id || typeof id !== "string") {
    throw new ApiError("VALIDATION_ERROR", "IDが不正です", 400)
  }

  const existing = await db.installment.findUnique({ where: { id } })
  if (!existing) {
    throw new ApiError("NOT_FOUND", "分割払いが見つかりません", 404)
  }

  if (existing.userId !== userId) {
    throw new ApiError("FORBIDDEN", "他人の分割払いは削除できません", 403)
  }

  await db.installment.delete({ where: { id } })

  return jsonOk({ id })
})
