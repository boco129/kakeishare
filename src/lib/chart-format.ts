// チャート用フォーマッタ

/** 金額を ¥12,345 形式にフォーマット */
export const formatJPY = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
}).format

/** パーセントを整数表示（例: 65%） */
export const formatPercent = (v: number) => `${Math.round(v)}%`
