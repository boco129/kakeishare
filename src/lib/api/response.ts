// API レスポンスヘルパー — 統一フォーマットで NextResponse.json を返す

import { NextResponse } from "next/server"
import type { ErrorCode } from "@/lib/validations/common"

/** 成功レスポンス */
export function jsonOk<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ ok: true, data, meta })
}

/** エラーレスポンス（本番環境では details キーを含めない） */
export function jsonError(
  code: ErrorCode,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(process.env.NODE_ENV === "development" && details != null
          ? { details }
          : {}),
      },
    },
    { status },
  )
}
