// CSV解析ロジック — エンコード変換 + パース + マッピング適用

import iconv from "iconv-lite"
import { parse } from "csv-parse/sync"
import type { CardCsvDefinition, CsvColumnMapping, NormalizedExpenseRow } from "./types"

/**
 * CSVバイナリを読み込み、エンコード変換 → パース → 正規化を行う。
 */
export function parseCsv(
  buffer: Buffer,
  definition: CardCsvDefinition,
): NormalizedExpenseRow[] {
  // 1. エンコーディング変換
  const text = definition.encoding === "UTF-8"
    ? buffer.toString("utf-8")
    : iconv.decode(buffer, definition.encoding)

  // 2. csv-parse でパース（hasHeader=true 前提。現時点で全カード会社がヘッダー付き）
  const records = parse(text, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
    delimiter: definition.delimiter,
    from_line: definition.skipRows + 1,
  }) as Record<string, string>[]

  // 3. マッピング適用して正規化
  return records
    .map((row) => normalizeRow(row, definition))
    .filter((row): row is NormalizedExpenseRow => row !== null)
}

/**
 * 1行のCSVレコードを共通フォーマットに正規化する。
 * パースに失敗した行はnullを返す（スキップ対象）。
 */
function normalizeRow(
  row: Record<string, string>,
  definition: CardCsvDefinition,
): NormalizedExpenseRow | null {
  const { mapping } = definition

  // 日付
  const dateRaw = extractColumnValue(row, mapping.date)
  if (!dateRaw) return null
  const date = parseDate(dateRaw)
  if (!date) return null

  // 店舗名・説明
  const description = extractColumnValue(row, mapping.description)
  if (!description) return null

  // 金額
  const amountRaw = extractColumnValue(row, mapping.amount)
  if (!amountRaw) return null
  const amount = parseAmount(amountRaw)
  if (amount === null) return null

  // 支払区分（任意）
  const paymentMethod = mapping.payment_method
    ? extractColumnValue(row, mapping.payment_method) || null
    : null

  // 分割回数（任意）
  let installmentCount: number | null = null
  if (mapping.installment_count) {
    installmentCount = extractInstallmentCount(row, mapping.installment_count)
  }

  // 備考（任意）
  const memo = mapping.memo
    ? extractColumnValue(row, mapping.memo) || null
    : null

  return {
    date,
    description,
    amount,
    paymentMethod,
    installmentCount,
    memo,
  }
}

/**
 * マッピング定義に基づいてカラム値を取得する。
 * column → alternateColumns の順にフォールバック。
 */
function extractColumnValue(
  row: Record<string, string>,
  mapping: CsvColumnMapping,
): string | null {
  if (mapping.column && row[mapping.column] !== undefined) {
    return row[mapping.column].trim() || null
  }

  if (mapping.alternateColumns) {
    for (const alt of mapping.alternateColumns) {
      if (row[alt] !== undefined && row[alt].trim()) {
        return row[alt].trim()
      }
    }
  }

  return null
}

/**
 * 分割回数を正規表現パターンで抽出する。
 */
function extractInstallmentCount(
  row: Record<string, string>,
  mapping: CsvColumnMapping,
): number | null {
  if (!mapping.extractFrom || !mapping.pattern) return null

  const sourceValue = row[mapping.extractFrom]
  if (!sourceValue) return null

  const match = sourceValue.match(new RegExp(mapping.pattern))
  if (!match?.[1]) return null

  const count = parseInt(match[1], 10)
  return isNaN(count) ? null : count
}

/**
 * 日付文字列を YYYY-MM-DD 形式に変換する。
 * 対応形式: YYYY/MM/DD, YYYY-MM-DD
 */
function parseDate(raw: string): string | null {
  // YYYY/MM/DD → YYYY-MM-DD
  const normalized = raw.replace(/\//g, "-")
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) return null

  const [, year, month, day] = match
  const y = parseInt(year, 10)
  const m = parseInt(month, 10)
  const d = parseInt(day, 10)

  // 実在日付チェック
  const dateObj = new Date(y, m - 1, d)
  if (
    dateObj.getFullYear() !== y ||
    dateObj.getMonth() !== m - 1 ||
    dateObj.getDate() !== d
  ) {
    return null
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

/**
 * 金額文字列を整数に変換する。
 * カンマ区切り、¥記号、全角数字、(1234)形式の負数に対応。
 * 不正な値はnullを返す（parseInt の先頭一致を避け、完全一致で検証）。
 */
function parseAmount(raw: string): number | null {
  const normalized = raw
    // 全角数字→半角
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    // 全角カンマ→半角
    .replace(/[，]/g, ",")
    // 全角マイナス→半角
    .replace(/[ー－−]/g, "-")
    // ¥記号除去
    .replace(/[¥￥]/g, "")
    .trim()

  if (!normalized) return null

  // (1,234) 形式を負数として扱う
  const paren = normalized.match(/^\(([\d,]+)\)$/)
  const candidate = paren ? `-${paren[1]}` : normalized

  // 完全一致で整数のみ許可（カンマ区切りあり or なし）
  if (!/^-?\d{1,3}(,\d{3})*$|^-?\d+$/.test(candidate)) return null

  const num = Number(candidate.replace(/,/g, ""))
  return Number.isSafeInteger(num) ? num : null
}
