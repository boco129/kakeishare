"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { MessageCircle, Send, RotateCcw, AlertTriangle } from "lucide-react"

type Message = {
  role: "user" | "assistant"
  content: string
}

type Props = {
  yearMonth: string
  aiAvailable: boolean
}

const MAX_HISTORY = 10

const PRESET_QUESTIONS = [
  "今月の家計はどうですか？",
  "節約できそうなポイントはありますか？",
  "先月と比べて変化はありますか？",
  "予算の使い方についてアドバイスをください",
]

export function ChatClient({ yearMonth, aiAvailable }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // 自動スクロール
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // アンマウント時にストリーミングを中断
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return

      const userMessage: Message = { role: "user", content: text.trim() }
      setMessages((prev) => [...prev, userMessage])
      setInput("")
      setError(null)
      setIsStreaming(true)

      // 履歴（最新MAX_HISTORY件）
      const history = [...messages, userMessage]
        .slice(-MAX_HISTORY)
        .map((m) => ({ role: m.role, content: m.content }))

      // 空のアシスタントメッセージを追加（ストリーミング用）
      setMessages((prev) => [...prev, { role: "assistant", content: "" }])

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            history: history.slice(0, -1), // 最新のuserメッセージはmessageパラメータで送る
            yearMonth,
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(
            data?.error?.message ?? `エラーが発生しました（${res.status}）`,
          )
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error("ストリーム読み取りに失敗しました")

        const decoder = new TextDecoder()
        let buffer = ""

        const processLine = (line: string) => {
          if (!line.startsWith("data: ")) return
          const json = line.slice(6)

          try {
            const event = JSON.parse(json) as
              | { type: "text"; text: string }
              | { type: "done"; remaining: number }
              | { type: "error"; message: string }

            if (event.type === "text") {
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last?.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + event.text,
                  }
                }
                return updated
              })
            } else if (event.type === "done") {
              setRemaining(event.remaining)
            } else if (event.type === "error") {
              setError(event.message)
              // エラー時に空のassistantメッセージを除去
              setMessages((prev) => {
                const last = prev[prev.length - 1]
                if (last?.role === "assistant" && !last.content) {
                  return prev.slice(0, -1)
                }
                return prev
              })
            }
          } catch {
            // JSONパースエラーは無視
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            processLine(line)
          }
        }

        // UTF-8終端フラッシュ + 残りバッファ処理
        buffer += decoder.decode()
        if (buffer.trim()) {
          processLine(buffer)
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return
        const message =
          e instanceof Error ? e.message : "通信エラーが発生しました"
        setError(message)
        // 空のアシスタントメッセージを削除
        setMessages((prev) => {
          const last = prev[prev.length - 1]
          if (last?.role === "assistant" && !last.content) {
            return prev.slice(0, -1)
          }
          return prev
        })
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [isStreaming, messages, yearMonth],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleNewConversation = () => {
    if (isStreaming && abortRef.current) {
      abortRef.current.abort()
    }
    setMessages([])
    setInput("")
    setError(null)
    setIsStreaming(false)
  }

  // AI未設定状態
  if (!aiAvailable) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-center space-y-3">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">AI機能が設定されていません</p>
          <p className="text-sm text-muted-foreground">
            チャット機能を利用するには管理者にお問い合わせください
          </p>
        </div>
      </div>
    )
  }

  // 初期状態（メッセージなし）
  if (messages.length === 0) {
    return (
      <>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
          <div className="text-center space-y-2">
            <MessageCircle className="mx-auto h-12 w-12 text-primary" />
            <h2 className="text-lg font-medium">家計相談アドバイザー</h2>
            <p className="text-sm text-muted-foreground">
              {yearMonth}の家計データをもとにアドバイスします
            </p>
          </div>
          <div className="grid w-full max-w-md gap-2">
            {PRESET_QUESTIONS.map((q) => (
              <Button
                key={q}
                variant="outline"
                className="h-auto whitespace-normal py-3 text-left text-sm"
                onClick={() => sendMessage(q)}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
        <ChatInput
          input={input}
          setInput={setInput}
          isStreaming={isStreaming}
          remaining={remaining}
          onSend={() => sendMessage(input)}
          onKeyDown={handleKeyDown}
          textareaRef={textareaRef}
        />
      </>
    )
  }

  // 会話中
  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-medium">家計相談</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewConversation}
          className="gap-1 text-xs"
        >
          <RotateCcw className="h-3 w-3" />
          新しい会話
        </Button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                {msg.role === "assistant" && !msg.content && isStreaming ? (
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce">·</span>
                    <span className="animate-bounce [animation-delay:0.2s]">
                      ·
                    </span>
                    <span className="animate-bounce [animation-delay:0.4s]">
                      ·
                    </span>
                  </span>
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
            </div>
          ))}
          {error && (
            <div className="flex justify-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      </div>
      <ChatInput
        input={input}
        setInput={setInput}
        isStreaming={isStreaming}
        remaining={remaining}
        onSend={() => sendMessage(input)}
        onKeyDown={handleKeyDown}
        textareaRef={textareaRef}
      />
    </>
  )
}

/** 入力エリア */
function ChatInput({
  input,
  setInput,
  isStreaming,
  remaining,
  onSend,
  onKeyDown,
  textareaRef,
}: {
  input: string
  setInput: (v: string) => void
  isStreaming: boolean
  remaining: number | null
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  return (
    <div className="border-t bg-background p-4">
      <div className="mx-auto flex max-w-2xl gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="家計について質問してください..."
          className="min-h-[44px] max-h-[120px] resize-none"
          rows={1}
          disabled={isStreaming}
        />
        <Button
          onClick={onSend}
          disabled={!input.trim() || isStreaming}
          size="icon"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {remaining !== null && (
        <p className="mx-auto mt-1 max-w-2xl text-xs text-muted-foreground">
          本日の残り回数: {remaining}回
        </p>
      )}
    </div>
  )
}
