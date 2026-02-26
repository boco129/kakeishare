// CSV取り込み履歴 API

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { jsonOk } from "@/lib/api/response"

/** GET /api/csv-import/history — 取り込み履歴一覧 */
export const GET = withApiHandler(async (request) => {
  const { userId, role } = await requireAuth()

  const { searchParams } = new URL(request.url)
  const yearMonth = searchParams.get("yearMonth") || undefined
  const limitParam = searchParams.get("limit")
  const rawLimit = limitParam ? Number(limitParam) : NaN
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20
  const page = Math.max(Number(searchParams.get("page")) || 1, 1)

  // ADMINは全件、MEMBERは自分のカード分のみ
  const where: Record<string, unknown> = {
    ...(role === "ADMIN" ? {} : { userId }),
    ...(yearMonth ? { yearMonth } : {}),
  }

  const [items, totalCount] = await Promise.all([
    db.csvImport.findMany({
      where,
      orderBy: { importedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true } },
        importedBy: { select: { id: true, name: true } },
      },
    }),
    db.csvImport.count({ where }),
  ])

  return jsonOk(
    {
      items: items.map((item) => ({
        id: item.id,
        cardType: item.cardType,
        cardName: item.cardName,
        yearMonth: item.yearMonth,
        importedAt: item.importedAt.toISOString(),
        recordCount: item.recordCount,
        unconfirmedCount: item.unconfirmedCount,
        owner: item.user,
        importedBy: item.importedBy,
      })),
    },
    { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) },
  )
})
