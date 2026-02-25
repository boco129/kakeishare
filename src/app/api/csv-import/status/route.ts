// CSV取り込みステータス API — 各カード×ユーザーの取り込み状況

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { jsonOk } from "@/lib/api/response"
import { getCardOptions, CARD_OWNERS } from "@/lib/csv"

/** GET /api/csv-import/status — 今月の取り込みステータス */
export const GET = withApiHandler(async (request) => {
  await requireAuth()

  const { searchParams } = new URL(request.url)
  // デフォルトは今月
  const now = new Date()
  const defaultYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const yearMonth = searchParams.get("yearMonth") || defaultYearMonth

  // 対象年月の取り込み履歴を取得
  const imports = await db.csvImport.findMany({
    where: { yearMonth },
    include: { user: { select: { id: true, name: true } } },
  })

  // カード選択肢
  const cardOptions = getCardOptions()
  const cardNameMap = new Map(cardOptions.map((c) => [c.value, c.label]))

  // ユーザー情報を取得
  const users = await db.user.findMany({
    select: { id: true, name: true },
  })
  const userNameMap = new Map(users.map((u) => [u.id, u.name]))

  // 各カード×ユーザーの取り込み状況を構築
  const items = CARD_OWNERS.map((pair) => {
    const hit = imports.find(
      (i) => i.userId === pair.userId && i.cardType === pair.cardType,
    )
    return {
      ownerUserId: pair.userId,
      ownerName: userNameMap.get(pair.userId) ?? "不明",
      cardType: pair.cardType,
      cardName: cardNameMap.get(pair.cardType) ?? pair.cardType,
      imported: !!hit,
      importedAt: hit?.importedAt.toISOString() ?? null,
      recordCount: hit?.recordCount ?? 0,
      unconfirmedCount: hit?.unconfirmedCount ?? 0,
    }
  })

  const missingCount = items.filter((i) => !i.imported).length

  return jsonOk({
    yearMonth,
    items,
    missingCount,
  })
})
