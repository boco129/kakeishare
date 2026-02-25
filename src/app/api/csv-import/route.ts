// CSV取り込み API — ファイルアップロード → パース → 重複チェック → DB保存

export const runtime = "nodejs"

import { db } from "@/lib/db"
import { withApiHandler } from "@/lib/api/handler"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonOk } from "@/lib/api/response"
import {
  csvImportInputSchema,
  MAX_FILE_SIZE,
  MAX_ROW_COUNT,
} from "@/lib/validations/csv-import"
import {
  parseCsv,
  generateExpenseDedupeHash,
  generateFileHash,
  cardMappings,
  isValidCardType,
} from "@/lib/csv"
import type { NormalizedExpenseRow } from "@/lib/csv"

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

  // ファイル存在チェック
  if (!file || !(file instanceof File)) {
    throw new ApiError("VALIDATION_ERROR", "CSVファイルを選択してください", 400)
  }

  // ファイルサイズチェック
  if (file.size > MAX_FILE_SIZE) {
    throw new ApiError("VALIDATION_ERROR", "ファイルサイズが上限（5MB）を超えています", 400)
  }

  // メタデータバリデーション
  const input = csvImportInputSchema.parse({
    cardType,
    yearMonth,
    ownerUserId,
  })

  // カード種別チェック
  if (!isValidCardType(input.cardType)) {
    throw new ApiError("VALIDATION_ERROR", "対応していないカード種別です", 400)
  }

  // 権限チェック: 他人のカードの取り込みはADMINのみ許可
  if (input.ownerUserId !== userId && role !== "ADMIN") {
    throw new ApiError("FORBIDDEN", "他のユーザーのCSVを取り込む権限がありません", 403)
  }

  // カード所有者の存在チェック
  const owner = await db.user.findUnique({ where: { id: input.ownerUserId } })
  if (!owner) {
    throw new ApiError("VALIDATION_ERROR", "指定されたカード所有者が存在しません", 400)
  }

  // ファイル読み込み
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // ファイルハッシュで同一ファイル重複チェック
  const fileHash = generateFileHash(buffer)
  const existingImport = await db.csvImport.findUnique({
    where: { userId_fileHash: { userId: input.ownerUserId, fileHash } },
  })
  if (existingImport) {
    throw new ApiError(
      "CONFLICT",
      `このCSVファイルは既に取り込み済みです（${existingImport.importedAt.toLocaleDateString("ja-JP")}）`,
      409,
    )
  }

  // CSVパース（不正CSV時は400で返す）
  const definition = cardMappings[input.cardType]
  let rows: NormalizedExpenseRow[]
  try {
    rows = parseCsv(buffer, definition)
  } catch {
    throw new ApiError("VALIDATION_ERROR", "CSV形式が不正です。ファイルの形式を確認してください", 400)
  }

  if (rows.length === 0) {
    throw new ApiError("VALIDATION_ERROR", "CSVに有効なデータが含まれていません", 400)
  }

  if (rows.length > MAX_ROW_COUNT) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `行数が上限（${MAX_ROW_COUNT}行）を超えています（${rows.length}行）`,
      400,
    )
  }

  // yearMonth と CSV明細の年月の整合チェック
  const outOfMonth = rows.find((r) => !r.date.startsWith(`${input.yearMonth}-`))
  if (outOfMonth) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `指定年月（${input.yearMonth}）とCSV明細の日付（${outOfMonth.date}）が一致しません`,
      400,
    )
  }

  // 重複検知用ハッシュを生成
  const rowsWithHash = rows.map((row) => ({
    ...row,
    dedupeHash: generateExpenseDedupeHash({
      userId: input.ownerUserId,
      cardType: input.cardType,
      date: row.date,
      description: row.description,
      amount: row.amount,
    }),
  }))

  // DB既存レコードとの重複チェック（件数比較方式：同日同店同額の複数利用に対応）
  const allHashes = rowsWithHash.map((r) => r.dedupeHash)
  const uniqueHashes = [...new Set(allHashes)]

  const existingGroups = await db.expense.groupBy({
    by: ["dedupeHash"],
    where: {
      userId: input.ownerUserId,
      dedupeHash: { in: uniqueHashes },
    },
    _count: { _all: true },
  })
  const existingCount = new Map(
    existingGroups.map((e) => [e.dedupeHash!, e._count._all]),
  )

  // CSV内のハッシュごとにグルーピング
  const incomingBuckets = new Map<string, typeof rowsWithHash>()
  for (const row of rowsWithHash) {
    const arr = incomingBuckets.get(row.dedupeHash) ?? []
    arr.push(row)
    incomingBuckets.set(row.dedupeHash, arr)
  }

  // 既存件数を超える分だけ取り込み対象
  const newRows: typeof rowsWithHash = []
  for (const [hash, arr] of incomingBuckets) {
    const already = existingCount.get(hash) ?? 0
    if (arr.length > already) {
      newRows.push(...arr.slice(already))
    }
  }
  const duplicateCount = rows.length - newRows.length

  // トランザクションで一括保存
  const result = await db.$transaction(async (tx) => {
    // CsvImport レコード作成
    const csvImport = await tx.csvImport.create({
      data: {
        userId: input.ownerUserId,
        importedById: userId,
        cardName: definition.name,
        yearMonth: input.yearMonth,
        fileHash,
        recordCount: newRows.length,
        unconfirmedCount: newRows.length, // 全件未確認
      },
    })

    // Expense レコード一括作成
    if (newRows.length > 0) {
      await tx.expense.createMany({
        data: newRows.map((row) => ({
          userId: input.ownerUserId,
          date: toLocalDate(row.date),
          amount: row.amount,
          description: row.description,
          categoryId: null, // Phase 4 の AI分類まで未設定
          visibility: "PUBLIC" as const, // カテゴリ未設定のためデフォルト
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

  return jsonOk(
    {
      importId: result.id,
      cardName: definition.name,
      yearMonth: input.yearMonth,
      importedCount: newRows.length,
      duplicateCount,
      totalRows: rows.length,
    },
  )
})
