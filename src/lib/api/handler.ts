// API ハンドラーラッパー — エラーを統一フォーマットに変換

import type { NextRequest } from "next/server"
import { ZodError } from "zod"
import { ApiError } from "./errors"
import { jsonError } from "./response"

/** Next.js 16 App Router のルートコンテキスト型 */
type RouteContext = {
  params?: Promise<Record<string, string | string[] | undefined>>
}

type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<Response>

/**
 * APIルートハンドラーをラップし、エラーハンドリングを統一する
 *
 * 使い方:
 * ```ts
 * export const GET = withApiHandler(async (request) => {
 *   const { userId } = await requireAuth()
 *   // ... ビジネスロジック
 *   return jsonOk(data)
 * })
 * ```
 */
export function withApiHandler(fn: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await fn(request, context)
    } catch (e) {
      if (e instanceof ApiError) {
        return jsonError(e.code, e.message, e.status, e.details)
      }
      if (e instanceof ZodError) {
        return jsonError("VALIDATION_ERROR", "入力が不正です", 400, e.flatten())
      }
      // 予期しないエラー
      console.error("[API Error]", e)
      return jsonError("INTERNAL_ERROR", "内部エラーが発生しました", 500)
    }
  }
}
