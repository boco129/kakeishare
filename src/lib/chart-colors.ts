// チャート用カラーパレット — CSS変数ベースで安定色割当

/** globals.css の --chart-1〜5 に対応 */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const

/** 文字列キーから安定したハッシュ値を生成 */
const hash = (s: string) =>
  [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0)

/** categoryId から安定した色を返す（同一キー→同一色） */
export const colorByCategoryKey = (key: string | null | undefined) => {
  const normalized = key ?? "uncategorized"
  return CHART_COLORS[hash(normalized) % CHART_COLORS.length]
}
