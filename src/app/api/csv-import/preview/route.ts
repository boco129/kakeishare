// CSV取り込みプレビュー API — パース・重複検知のみ（DB保存なし）

export const runtime = "nodejs"

import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { jsonOk } from "@/lib/api/response"
import { analyzeCsvImport } from "@/lib/csv"

/** POST /api/csv-import/preview — CSVプレビュー */
export const POST = withApiHandler(async (request) => {
  const { userId, role } = await requireAuth()

  const formData = await request.formData()
  const file = formData.get("file")
  const cardType = formData.get("cardType") as string | null
  const yearMonth = formData.get("yearMonth") as string | null
  const ownerUserId = formData.get("ownerUserId") as string | null

  const analysis = await analyzeCsvImport({
    file: file as File,
    cardType: cardType ?? "",
    yearMonth: yearMonth ?? "",
    ownerUserId: ownerUserId ?? "",
    importerId: userId,
    importerRole: role,
  })

  return jsonOk({
    cardName: analysis.cardName,
    yearMonth: analysis.yearMonth,
    totalRows: analysis.totalRows,
    duplicateCount: analysis.duplicateCount,
    newCount: analysis.newRows.length,
    previewRows: analysis.previewRows,
  })
})
