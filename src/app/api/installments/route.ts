// 分割払い API — 一覧取得 / 新規登録

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { installmentCreateSchema, installmentStatusSchema } from "@/lib/validations/installment"
import type { Prisma } from "@/generated/prisma/client"

const PRIVATE_LABEL = "個人支出" as const

/** 算出フィールドを計算して返却用オブジェクトを構築 */
function toInstallmentResponse(
  inst: {
    id: string
    userId: string
    description: string
    totalAmount: number
    monthlyAmount: number
    totalMonths: number
    remainingMonths: number
    startDate: Date
    visibility: string
    fee: number
    createdAt: Date
    updatedAt: Date
    user?: { id: string; name: string } | null
  },
  requestUserId: string,
) {
  const isOwn = inst.userId === requestUserId
  const remainingAmount = inst.monthlyAmount * inst.remainingMonths
  const progressRate =
    inst.totalMonths > 0
      ? Math.round(
          ((inst.totalMonths - inst.remainingMonths) / inst.totalMonths) * 1000,
        ) / 10
      : 0

  if (isOwn || inst.visibility === "PUBLIC") {
    return {
      id: inst.id,
      userId: inst.userId,
      userName: inst.user?.name ?? null,
      description: inst.description,
      totalAmount: inst.totalAmount,
      monthlyAmount: inst.monthlyAmount,
      totalMonths: inst.totalMonths,
      remainingMonths: inst.remainingMonths,
      remainingAmount,
      progressRate,
      startDate: inst.startDate,
      visibility: inst.visibility,
      fee: inst.fee,
      createdAt: inst.createdAt,
      updatedAt: inst.updatedAt,
      masked: false,
    }
  }

  if (inst.visibility === "AMOUNT_ONLY") {
    return {
      id: inst.id,
      userId: inst.userId,
      userName: inst.user?.name ?? null,
      description: PRIVATE_LABEL,
      totalAmount: inst.totalAmount,
      monthlyAmount: inst.monthlyAmount,
      totalMonths: inst.totalMonths,
      remainingMonths: inst.remainingMonths,
      remainingAmount,
      progressRate,
      startDate: inst.startDate,
      visibility: inst.visibility,
      fee: inst.fee,
      createdAt: inst.createdAt,
      updatedAt: inst.updatedAt,
      masked: true,
    }
  }

  // CATEGORY_TOTAL: items に含めない
  return null
}

/** GET /api/installments — 分割払い一覧（プライバシーフィルター付き） */
export const GET = withApiHandler(async (request) => {
  const { userId } = await requireAuth()

  const url = new URL(request.url)
  const status = installmentStatusSchema.parse(
    url.searchParams.get("status") ?? undefined,
  )

  // ステータスフィルタ
  const statusWhere: Prisma.InstallmentWhereInput =
    status === "active"
      ? { remainingMonths: { gt: 0 } }
      : status === "completed"
        ? { remainingMonths: 0 }
        : {}

  // 自分の分割払い + 相手のPUBLIC/AMOUNT_ONLYのみ取得（CATEGORY_TOTALはDB時点で除外）
  const visibleWhere: Prisma.InstallmentWhereInput = {
    AND: [
      statusWhere,
      {
        OR: [
          { userId },
          { visibility: { in: ["PUBLIC", "AMOUNT_ONLY"] } },
        ],
      },
    ],
  }

  // CATEGORY_TOTALの集計用（相手のもののみ）
  const categoryTotalWhere: Prisma.InstallmentWhereInput = {
    AND: [
      statusWhere,
      { visibility: "CATEGORY_TOTAL" },
      { userId: { not: userId } },
    ],
  }

  const [installments, categoryTotalAgg] = await db.$transaction([
    db.installment.findMany({
      where: visibleWhere,
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ startDate: "desc" }, { id: "desc" }],
    }),
    db.installment.aggregate({
      where: categoryTotalWhere,
      _count: { _all: true },
      _sum: { monthlyAmount: true },
    }),
  ])

  // プライバシーフィルタ適用
  const items = installments
    .map((inst) => toInstallmentResponse(inst, userId))
    .filter((item): item is NonNullable<typeof item> => item !== null)

  // 集計情報
  const summary = {
    totalCount: items.length + (categoryTotalAgg._count._all ?? 0),
    totalMonthlyAmount:
      items.reduce((sum, item) => sum + item.monthlyAmount, 0) +
      (categoryTotalAgg._sum?.monthlyAmount ?? 0),
    hiddenCount: categoryTotalAgg._count._all ?? 0,
  }

  return jsonOk({ items, summary })
})

/** POST /api/installments — 分割払い新規登録 */
export const POST = withApiHandler(async (request) => {
  const { userId } = await requireAuth()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError("VALIDATION_ERROR", "JSON形式が不正です", 400)
  }
  const input = installmentCreateSchema.parse(body)

  const installment = await db.installment.create({
    data: {
      userId,
      description: input.description,
      totalAmount: input.totalAmount,
      monthlyAmount: input.monthlyAmount,
      totalMonths: input.totalMonths,
      remainingMonths: input.remainingMonths,
      startDate: input.startDate,
      visibility: input.visibility ?? "PUBLIC",
      fee: input.fee,
    },
    include: { user: { select: { id: true, name: true } } },
  })

  return jsonOk(toInstallmentResponse(installment, userId))
})
