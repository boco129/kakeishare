// チャットアドバイザー ストリーミングAPI
// POST /api/ai/chat — Claude Sonnet で家計相談にストリーミング応答

import { z } from "zod"
import { requireAuth } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/errors"
import { jsonError } from "@/lib/api/response"
import { isAIAvailable, getAnthropicClientSingleton, AI_MODELS } from "@/lib/ai"
import { buildChatSystemPrompt, buildChatUserMessage } from "@/lib/ai/prompts"
import { buildChatContext } from "@/lib/ai/build-chat-context"
import { consumeChatRateLimit } from "@/lib/ai/chat-rate-limit"
import { logTokenUsage } from "@/lib/ai/usage-logger"
import { env } from "@/lib/env"

export const maxDuration = 60

const MAX_HISTORY_MESSAGES = 10

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
})

const requestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(messageSchema).max(MAX_HISTORY_MESSAGES).default([]),
  yearMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
})

/** POST /api/ai/chat — ストリーミングチャット応答 */
export async function POST(request: Request) {
  // 1. 認証チェック（エラーはJSON返却）
  let userId: string
  try {
    const auth = await requireAuth()
    userId = auth.userId
  } catch (e) {
    if (e instanceof ApiError) {
      return jsonError(e.code, e.message, e.status)
    }
    return jsonError("INTERNAL_ERROR", "認証エラー", 500)
  }

  // 2. AI利用可能チェック
  if (!isAIAvailable(env)) {
    return jsonError("INTERNAL_ERROR", "AI機能が設定されていません", 503)
  }

  // 3. リクエストパース
  let parsed: z.infer<typeof requestSchema>
  try {
    const body = await request.json()
    parsed = requestSchema.parse(body)
  } catch {
    return jsonError("VALIDATION_ERROR", "入力が不正です", 400)
  }

  // 4. レート制限
  const rateLimit = consumeChatRateLimit(userId)
  if (!rateLimit.allowed) {
    return jsonError(
      "FORBIDDEN",
      "チャットの1日の利用上限（20回）に達しました",
      429,
    )
  }

  // 5. コンテキスト生成
  let context: string
  try {
    context = await buildChatContext(userId, parsed.yearMonth)
  } catch (e) {
    console.error("[ai.chat] コンテキスト生成失敗:", e)
    return jsonError("INTERNAL_ERROR", "データの取得に失敗しました", 500)
  }

  // 6. メッセージ配列を構築（コンテキストは最新メッセージのみに付与）
  const userMessage = buildChatUserMessage(parsed.message, context)
  const messages = [
    ...parsed.history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ]

  // 7. ストリーミング応答
  const client = getAnthropicClientSingleton(env)
  const encoder = new TextEncoder()

  // クライアント切断時にAIストリームを中断するための参照
  let aiStream: ReturnType<typeof client.messages.stream> | null = null

  const readable = new ReadableStream({
    async start(controller) {
      try {
        aiStream = client.messages.stream({
          model: AI_MODELS.REPORT,
          max_tokens: 1024,
          system: buildChatSystemPrompt(),
          messages,
        })

        aiStream.on("text", (text: string) => {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "text", text })}\n\n`,
            ),
          )
        })

        const finalMessage = await aiStream.finalMessage()

        logTokenUsage("chat", {
          input_tokens: finalMessage.usage.input_tokens,
          output_tokens: finalMessage.usage.output_tokens,
          cache_creation_input_tokens: undefined,
          cache_read_input_tokens: undefined,
        })

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", remaining: rateLimit.remaining })}\n\n`,
          ),
        )
        controller.close()
      } catch (e) {
        console.error("[ai.chat] ストリーミング失敗:", e)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: "AI応答の生成に失敗しました" })}\n\n`,
          ),
        )
        controller.close()
      }
    },
    cancel() {
      // クライアント切断時にAIストリームを中断（トークン消費を抑止）
      aiStream?.abort()
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
