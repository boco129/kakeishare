// カード会社CSVマッピング定義 — 一覧エクスポート

import { eposMapping } from "./epos"
import { mufgJcbMapping } from "./mufg-jcb"
import { mufgVisaMapping } from "./mufg-visa"
import type { CardCsvDefinition, CardType } from "../types"

/** 全マッピング定義 */
export const cardMappings: Record<CardType, CardCsvDefinition> = {
  epos: eposMapping,
  mufg_jcb: mufgJcbMapping,
  mufg_visa: mufgVisaMapping,
}

/** CardTypeバリデーション */
export function isValidCardType(value: string): value is CardType {
  return value in cardMappings
}

/** カード選択肢一覧（UI用） */
export function getCardOptions() {
  return Object.values(cardMappings).map((m) => ({
    value: m.id,
    label: m.name,
  }))
}
