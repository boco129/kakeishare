// 開発・テスト用: レート制限状態をリセットするエンドポイント
// 本番環境では404を返す

import { NextResponse } from "next/server"
import { resetAllRateLimits } from "@/lib/auth/rate-limiter"

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  resetAllRateLimits()
  return NextResponse.json({ ok: true })
}
