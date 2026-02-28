// CSV取り込み API — 共通サービスを利用してアップロード → パース → 重複チェック → DB保存

export const runtime = "nodejs"

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import { analyzeCsvImport } from "@/lib/csv"
import { runAiClassificationStep } from "@/lib/csv/ai-classify-step"

/** YYYY-MM-DD 文字列をローカルタイムゾーンの Date に変換 */
function toLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** POST /api/csv-import — CSV取り込み */
export const POST = withApiHandler(async (request) => {
  const { userId, role } = await requireAuth()

  // multipart/form-data の解析
  const formData = await request.formData()
  const file = formData.get("file")
  const cardType = formData.get("cardType") as string | null
  const yearMonth = formData.get("yearMonth") as string | null
  const ownerUserId = formData.get("ownerUserId") as string | null

  // 共通サービスで分析
  const analysis = await analyzeCsvImport({
    file: file as File,
    cardType: cardType ?? "",
    yearMonth: yearMonth ?? "",
    ownerUserId: ownerUserId ?? "",
    importerId: userId,
    importerRole: role,
  })

  // ファイルハッシュで同一ファイル重複チェック
  const existingImport = await db.csvImport.findUnique({
    where: { userId_fileHash: { userId: analysis.ownerUserId, fileHash: analysis.fileHash } },
  })
  if (existingImport) {
    throw new ApiError(
      "CONFLICT",
      `このCSVファイルは既に取り込み済みです（${existingImport.importedAt.toLocaleDateString("ja-JP")}）`,
      409,
    )
  }

  // トランザクションで一括保存（ユニーク制約違反は409で返す）
  let result
  try {
    result = await db.$transaction(async (tx) => {
      const csvImport = await tx.csvImport.create({
        data: {
          userId: analysis.ownerUserId,
          importedById: userId,
          cardType: analysis.cardType,
          cardName: analysis.cardName,
          yearMonth: analysis.yearMonth,
          fileHash: analysis.fileHash,
          recordCount: analysis.newRows.length,
          unconfirmedCount: analysis.newRows.length,
        },
      })

      if (analysis.newRows.length > 0) {
        await tx.expense.createMany({
          data: analysis.newRows.map((row) => ({
            userId: analysis.ownerUserId,
            date: toLocalDate(row.date),
            amount: row.amount,
            description: row.description,
            categoryId: null,
            visibility: "PUBLIC" as const,
            source: "CSV_IMPORT" as const,
            csvImportId: csvImport.id,
            confirmed: false,
            aiCategorized: false,
            dedupeHash: row.dedupeHash,
            memo: row.memo,
          })),
        })
      }

      return csvImport
    })
  } catch (e: unknown) {
    // ユニーク制約違反（並行リクエストによる同一ファイル重複）
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "P2002") {
      throw new ApiError("CONFLICT", "このCSVファイルは既に取り込み済みです", 409)
    }
    throw e
  }

  // AI分類ステップ（トランザクション外で実行 — AI遅延でCSV取込自体を失敗させない）
  const aiResult = await runAiClassificationStep(result.id, analysis.ownerUserId)

  return jsonOk({
    importId: result.id,
    cardName: analysis.cardName,
    yearMonth: analysis.yearMonth,
    importedCount: analysis.newRows.length,
    duplicateCount: analysis.duplicateCount,
    totalRows: analysis.totalRows,
    aiClassified: aiResult !== null,
    unconfirmedCount: aiResult?.unconfirmedCount ?? analysis.newRows.length,
  })
})
