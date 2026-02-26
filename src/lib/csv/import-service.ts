// CSV取り込み共通サービス — preview/import で共通のパース・重複検知ロジック

import { db } from "@/lib/db"
import { ApiError } from "@/lib/api/errors"
import {
  csvImportInputSchema,
  MAX_FILE_SIZE,
  MAX_ROW_COUNT,
} from "@/lib/validations/csv-import"
import { parseCsv } from "./parser"
import { generateExpenseDedupeHash, generateFileHash } from "./hash"
import { cardMappings, isValidCardType } from "./mappings"
import type { NormalizedExpenseRow, CardType } from "./types"

/** 分析結果の型 */
export interface CsvAnalysisResult {
  cardType: CardType
  cardName: string
  yearMonth: string
  ownerUserId: string
  fileHash: string
  totalRows: number
  duplicateCount: number
  newRows: Array<NormalizedExpenseRow & { dedupeHash: string }>
  /** プレビュー用（最大100件） */
  previewRows: Array<NormalizedExpenseRow & { dedupeHash: string; isDuplicate: boolean }>
}

/**
 * CSVファイルを分析し、パース・重複検知まで実行する。
 * DB保存は行わない（preview/import 共通で利用）。
 */
export async function analyzeCsvImport(input: {
  file: File
  cardType: string
  yearMonth: string
  ownerUserId: string
  importerId: string
  importerRole: string
}): Promise<CsvAnalysisResult> {
  // ファイル存在チェック
  if (!input.file || !(input.file instanceof File)) {
    throw new ApiError("VALIDATION_ERROR", "CSVファイルを選択してください", 400)
  }

  // ファイルサイズチェック
  if (input.file.size > MAX_FILE_SIZE) {
    throw new ApiError("VALIDATION_ERROR", "ファイルサイズが上限（5MB）を超えています", 400)
  }

  // メタデータバリデーション
  const meta = csvImportInputSchema.parse({
    cardType: input.cardType,
    yearMonth: input.yearMonth,
    ownerUserId: input.ownerUserId,
  })

  // カード種別チェック
  if (!isValidCardType(meta.cardType)) {
    throw new ApiError("VALIDATION_ERROR", "対応していないカード種別です", 400)
  }

  // 権限チェック: 他人のカードの取り込みはADMINのみ許可
  if (meta.ownerUserId !== input.importerId && input.importerRole !== "ADMIN") {
    throw new ApiError("FORBIDDEN", "他のユーザーのCSVを取り込む権限がありません", 403)
  }

  // カード所有者の存在チェック
  const owner = await db.user.findUnique({ where: { id: meta.ownerUserId } })
  if (!owner) {
    throw new ApiError("VALIDATION_ERROR", "指定されたカード所有者が存在しません", 400)
  }

  // ファイル読み込み
  const arrayBuffer = await input.file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // ファイルハッシュ
  const fileHash = generateFileHash(buffer)

  // CSVパース
  const definition = cardMappings[meta.cardType]
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
  const outOfMonth = rows.find((r) => !r.date.startsWith(`${meta.yearMonth}-`))
  if (outOfMonth) {
    throw new ApiError(
      "VALIDATION_ERROR",
      `指定年月（${meta.yearMonth}）とCSV明細の日付（${outOfMonth.date}）が一致しません`,
      400,
    )
  }

  // 重複検知用ハッシュを生成
  const rowsWithHash = rows.map((row) => ({
    ...row,
    dedupeHash: generateExpenseDedupeHash({
      userId: meta.ownerUserId,
      cardType: meta.cardType,
      date: row.date,
      description: row.description,
      amount: row.amount,
    }),
  }))

  // DB既存レコードとの重複チェック
  const allHashes = rowsWithHash.map((r) => r.dedupeHash)
  const uniqueHashes = [...new Set(allHashes)]

  const existingGroups = await db.expense.groupBy({
    by: ["dedupeHash"],
    where: {
      userId: meta.ownerUserId,
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
  const duplicateHashes = new Set<string>()
  for (const [hash, arr] of incomingBuckets) {
    const already = existingCount.get(hash) ?? 0
    if (already > 0) {
      duplicateHashes.add(hash)
    }
    if (arr.length > already) {
      newRows.push(...arr.slice(already))
    }
  }
  const duplicateCount = rows.length - newRows.length

  // プレビュー用行（重複フラグ付き、最大100件）
  const previewRows = rowsWithHash.slice(0, 100).map((row) => ({
    ...row,
    isDuplicate: duplicateHashes.has(row.dedupeHash) && !newRows.includes(row),
  }))

  return {
    cardType: meta.cardType,
    cardName: definition.name,
    yearMonth: meta.yearMonth,
    ownerUserId: meta.ownerUserId,
    fileHash,
    totalRows: rows.length,
    duplicateCount,
    newRows,
    previewRows,
  }
}
