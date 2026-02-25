// CSV重複検知 — ハッシュ生成

import { createHash } from "node:crypto"
import type { CardType } from "./types"

/**
 * 支出の重複検知用ハッシュを生成する。
 * userId + cardType + date + description + amount で一意性を担保。
 */
export function generateExpenseDedupeHash(input: {
  userId: string
  cardType: CardType
  date: string // YYYY-MM-DD
  description: string
  amount: number
}): string {
  // 説明文を正規化（空白統一・全角→半角スペース・小文字化）
  const normalizedDesc = input.description
    .trim()
    .replace(/\u3000/g, " ") // 全角スペース → 半角
    .replace(/\s+/g, " ")
    .toLowerCase()

  const raw = [
    input.userId,
    input.cardType,
    input.date,
    normalizedDesc,
    String(input.amount),
  ].join("\x1f") // Unit Separator で区切り

  return createHash("sha256").update(raw).digest("hex")
}

/**
 * CSVファイル全体のハッシュを生成する（同一ファイル再取り込み防止）。
 */
export function generateFileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex")
}
