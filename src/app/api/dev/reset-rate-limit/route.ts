// 開発・テスト用: レート制限状態をリセットするエンドポイント
// 本番環境では404を返す（CI E2Eテスト環境のみ例外許可）

import { NextResponse } from "next/server"
import { resetAllRateLimits } from "@/lib/auth/rate-limiter"
import { resetChatRateLimitStore } from "@/lib/ai/chat-rate-limit"
import { resetReportRateLimitStore } from "@/lib/ai/report-rate-limit"
import { resetInsightsRateLimitStore } from "@/lib/ai/insights-rate-limit"

export async function POST() {
  // 開発環境: 常に許可
  // 本番環境: NODE_ENV=production では CI=true かつ E2E_TEST_MODE=true の場合のみ許可
  if (process.env.NODE_ENV === "production") {
    const isCIE2E = process.env.CI === "true" && process.env.E2E_TEST_MODE === "true"
    if (!isCIE2E) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
  }

  // 認証レート制限のリセット
  resetAllRateLimits()

  // AIレート制限のリセット
  resetChatRateLimitStore()
  resetReportRateLimitStore()
  resetInsightsRateLimitStore()

  return NextResponse.json({ ok: true })
}
