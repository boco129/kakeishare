// CSV取り込み共通型定義

/** カラムマッピング定義 */
export interface CsvColumnMapping {
  /** CSVのヘッダー名（完全一致） */
  column: string | null
  /** カラム名が複数の可能性がある場合のフォールバック */
  alternateColumns?: string[]
  /** 日付のパース形式 */
  format?: string
  /** 数値型の指定 */
  type?: "integer" | "float"
  /** 別カラムから正規表現で値を抽出する場合 */
  extractFrom?: string
  /** 抽出用の正規表現パターン */
  pattern?: string
}

/** カード会社CSVマッピング定義 */
export interface CardCsvDefinition {
  /** 一意の識別子 */
  id: CardType
  /** 表示名 */
  name: string
  /** ファイルエンコーディング */
  encoding: "UTF-8" | "Shift_JIS" | "EUC-JP"
  /** ヘッダー行前にスキップする行数 */
  skipRows: number
  /** ヘッダー行の有無 */
  hasHeader: boolean
  /** 区切り文字 */
  delimiter: string
  /** 共通フォーマットへのマッピング */
  mapping: {
    date: CsvColumnMapping
    description: CsvColumnMapping
    amount: CsvColumnMapping
    payment_method?: CsvColumnMapping
    installment_count?: CsvColumnMapping
    memo?: CsvColumnMapping
  }
  /** 運用上の補足メモ */
  notes?: string
}

/** 対応カード種別 */
export type CardType = "epos" | "mufg_jcb" | "mufg_visa"

/** 正規化後の共通フォーマット（1行分） */
export interface NormalizedExpenseRow {
  date: string // YYYY-MM-DD
  description: string
  amount: number // 正の整数（円）、返金時はマイナス
  paymentMethod: string | null
  installmentCount: number | null
  memo: string | null
}

/** CSV取り込み結果 */
export interface CsvImportResult {
  importedCount: number
  duplicateCount: number
  totalRows: number
  yearMonth: string
}
