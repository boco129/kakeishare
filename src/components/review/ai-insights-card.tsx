"use client"

import { useState } from "react"
import { Bot, Loader2, RefreshCw, TrendingDown, Target } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatJPY } from "@/lib/chart-format"
import type { AIInsightsOutput } from "@/lib/ai/types"

type Props = {
  yearMonth: string
  aiAvailable: boolean
}

const priorityLabel: Record<string, { text: string; className: string }> = {
  high: { text: "優先高", className: "bg-destructive/10 text-destructive" },
  medium: { text: "優先中", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  low: { text: "優先低", className: "bg-muted text-muted-foreground" },
}

const confidenceLabel: Record<string, { text: string; className: string }> = {
  high: { text: "信頼度: 高", className: "text-green-600 dark:text-green-400" },
  medium: { text: "信頼度: 中", className: "text-orange-600 dark:text-orange-400" },
  low: { text: "信頼度: 低", className: "text-destructive" },
}

export function AIInsightsCard({ yearMonth, aiAvailable }: Props) {
  const [insights, setInsights] = useState<AIInsightsOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yearMonth }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        toast.error(json?.error?.message ?? "AI分析の生成に失敗しました")
        return
      }
      const json = await res.json()
      setInsights(json.data.insights)
      setRemaining(json.data.remaining)
    } catch {
      toast.error("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  // AI未設定
  if (!aiAvailable) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI削減提案・支出予測
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            AI機能を利用するには環境変数（ANTHROPIC_API_KEY）を設定してください
          </p>
        </CardContent>
      </Card>
    )
  }

  // 未生成
  if (!insights) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI削減提案・支出予測
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            過去のデータを分析し、カテゴリ別の削減提案と来月の支出予測を生成します。
          </p>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            size="sm"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                分析中…
              </>
            ) : (
              "AI分析を実行"
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // 生成済み
  const conf = confidenceLabel[insights.forecast.confidence] ?? confidenceLabel.low
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI削減提案・支出予測
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleGenerate}
            disabled={loading}
            title="再生成"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* サマリー */}
        <p className="text-sm">{insights.summary}</p>

        {/* 削減提案 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5" />
            削減提案
          </h4>
          <div className="space-y-2">
            {insights.suggestions.map((s, i) => {
              const badge = priorityLabel[s.priority] ?? priorityLabel.low
              return (
                <div
                  key={i}
                  className="rounded-lg border p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.category}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${badge.className}`}
                    >
                      {badge.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>現在 {formatJPY(s.currentAverage)}/月</span>
                    <span>→</span>
                    <span>目標 {formatJPY(s.targetAmount)}/月</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      −{formatJPY(s.savingAmount)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* 来月の支出予測 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            来月の支出予測
          </h4>
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">
                {formatJPY(insights.forecast.totalPredicted)}
              </span>
              <span className={`text-xs font-medium ${conf.className}`}>
                {conf.text}
              </span>
            </div>
            {insights.forecast.confidence !== "high" && (
              <p className="text-xs text-muted-foreground">
                {insights.forecast.confidenceReason}
              </p>
            )}
            <div className="divide-y">
              {insights.forecast.categories.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5 text-xs"
                >
                  <span>{c.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatJPY(c.predictedAmount)}
                    </span>
                    <span className="text-muted-foreground max-w-[120px] truncate">
                      {c.reason}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between pt-1 border-t">
          <p className="text-xs text-muted-foreground">
            AI生成 — 参考情報としてご利用ください
          </p>
          {remaining !== null && (
            <p className="text-xs text-muted-foreground">
              残り{remaining}回/月
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
