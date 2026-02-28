"use client"

import { TrendingDown, TrendingUp, Minus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatJPY } from "@/lib/chart-format"

type Props = {
  totalAmount: number
  count: number
  comparison: {
    diff: number
    ratio: number | null
  }
}

export function MonthlySummaryCard({ totalAmount, count, comparison }: Props) {
  const isIncrease = comparison.diff > 0
  const isDecrease = comparison.diff < 0

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">今月の支出</p>
          <p className="text-lg font-bold">{formatJPY(totalAmount)}</p>
          <p className="text-xs text-muted-foreground">{count}件</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">前月比</p>
          <div className="flex items-center gap-1">
            {isIncrease && <TrendingUp className="h-4 w-4 text-destructive" />}
            {isDecrease && <TrendingDown className="h-4 w-4 text-emerald-500" />}
            {!isIncrease && !isDecrease && <Minus className="h-4 w-4 text-muted-foreground" />}
            <span className={`text-lg font-bold ${isIncrease ? "text-destructive" : isDecrease ? "text-emerald-500" : ""}`}>
              {comparison.diff > 0 ? "+" : ""}{formatJPY(comparison.diff)}
            </span>
          </div>
          {comparison.ratio !== null && (
            <p className={`text-xs ${isIncrease ? "text-destructive" : isDecrease ? "text-emerald-500" : "text-muted-foreground"}`}>
              {comparison.ratio > 0 ? "+" : ""}{comparison.ratio.toFixed(1)}%
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
