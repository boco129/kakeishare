"use client"

import { useState } from "react"
import { Bot, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Props = {
  yearMonth: string
  aiAvailable: boolean
}

export function AIReportCard({ yearMonth, aiAvailable }: Props) {
  const [report, setReport] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearMonth }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        toast.error(json?.error?.message ?? "レポート生成に失敗しました")
        return
      }
      const json = await res.json()
      setReport(json.data.report)
      setRemaining(json.data.remaining)
    } catch {
      toast.error("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  // AI未設定時
  if (!aiAvailable) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 text-center space-y-2">
          <Bot className="mx-auto size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            AI機能を利用するには環境変数を設定してください
          </p>
        </CardContent>
      </Card>
    )
  }

  // レポート未生成
  if (!report) {
    return (
      <Card>
        <CardContent className="py-4 text-center space-y-3">
          <Bot className="mx-auto size-8 text-primary" />
          <p className="text-sm text-muted-foreground">
            AIが今月の家計を分析します
          </p>
          <Button onClick={handleGenerate} disabled={loading} size="sm">
            {loading ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                生成中...
              </>
            ) : (
              "レポートを生成"
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // レポート表示
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-1.5">
            <Bot className="size-4" />
            AI家計分析
          </CardTitle>
          <div className="flex items-center gap-2">
            {remaining !== null && (
              <span className="text-xs text-muted-foreground">
                残り{remaining}回
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleGenerate}
              disabled={loading}
              aria-label="レポートを再生成"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {report}
        </div>
        <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
          <Bot className="size-3" />
          AI生成 — 参考情報としてご利用ください
        </p>
      </CardContent>
    </Card>
  )
}
