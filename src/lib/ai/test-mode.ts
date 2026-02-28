// AI E2Eテスト用モック制御
// 環境変数 AI_MOCK_MODE でAPI呼び出しをモックに差し替える
// off: 通常動作, success: モック成功応答, error: モックエラー, unavailable: AI未設定を模擬

export type AIMockMode = "off" | "success" | "error" | "unavailable"

export function getAIMockMode(): AIMockMode {
  // 本番環境ではモックを無効化（CI E2Eテスト環境のみ許可）
  const isProduction = process.env.NODE_ENV === "production"
  const isCITest = process.env.CI === "true"
  if (isProduction && !isCITest) return "off"

  const v = process.env.AI_MOCK_MODE
  if (v === "success" || v === "error" || v === "unavailable") return v
  return "off"
}

/** モックレポート（テスト用固定文面） */
export const MOCK_REPORT =
  "## 家計レポート（テスト）\n\n今月の支出は順調です。食費が予算内に収まっています。"

/** モックInsights（テスト用固定データ） */
export const MOCK_INSIGHTS = {
  suggestions: [
    {
      category: "食費",
      currentAverage: 50000,
      targetAmount: 40000,
      priority: "high" as const,
      reasoning: "外食頻度を減らすことで月1万円の削減が見込めます",
    },
  ],
  forecast: {
    totalEstimate: 200000,
    categories: [
      { category: "食費", estimate: 45000 },
      { category: "日用品", estimate: 15000 },
    ],
    reasoning: "過去の傾向から安定した支出が予測されます",
  },
}

/** モックチャット応答（テスト用固定文面） */
export const MOCK_CHAT_RESPONSE =
  "ご質問ありがとうございます。家計データを確認しましたが、現在の支出は概ね適切な水準です。"
