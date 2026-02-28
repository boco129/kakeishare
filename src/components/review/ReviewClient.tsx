"use client"

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  CategoryPieChart,
  MonthlyBarChart,
  CoupleRatioChart,
  BudgetProgressBar,
  CategoryTrendChart,
} from "@/components/charts"
import { formatJPY } from "@/lib/chart-format"
import { colorByCategoryKey } from "@/lib/chart-colors"
import { AIReportCard } from "./ai-report-card"
import type { ReviewSummary } from "@/lib/dashboard"

type Props = {
  data: ReviewSummary
  yearMonth: string
  aiAvailable: boolean
}

type SummaryTabProps = Props

// ─── サマリータブ ─────────────────────────────────────

function SummaryTab({ data, yearMonth, aiAvailable }: SummaryTabProps) {
  const remaining = data.budget.remainingBudget
  const hasBudget = data.budget.totalBudget > 0

  // カテゴリTOP5
  const top5 = data.categories.slice(0, 5).map((c) => ({
    categoryKey: c.categoryId ?? "uncategorized",
    name: c.categoryName ?? "未分類",
    amount: c.amount,
    fill: colorByCategoryKey(c.categoryId),
  }))

  const top5Config: ChartConfig = Object.fromEntries(
    top5.map((c) => [
      c.categoryKey,
      { label: c.name, color: c.fill },
    ]),
  )

  return (
    <div className="space-y-4">
      {/* 今月支出合計 + 予算 */}
      <Card>
        <CardContent className="py-4 text-center space-y-1">
          <p className="text-sm text-muted-foreground">今月の支出合計</p>
          <p className="text-3xl font-bold">{formatJPY(data.monthly.totalAmount)}</p>
          {hasBudget && (
            <p className={`text-sm ${remaining < 0 ? "text-destructive" : "text-muted-foreground"}`}>
              予算 {formatJPY(data.budget.totalBudget)} → 残 {formatJPY(remaining)}
            </p>
          )}
          {/* 前月比 */}
          {data.monthlyComparison.ratio !== null && (
            <p className={`text-xs ${data.monthlyComparison.diff > 0 ? "text-destructive" : data.monthlyComparison.diff < 0 ? "text-green-600" : "text-muted-foreground"}`}>
              前月比 {data.monthlyComparison.diff > 0 ? "+" : ""}{formatJPY(data.monthlyComparison.diff)}
              （{data.monthlyComparison.diff > 0 ? "+" : ""}{data.monthlyComparison.ratio}%）
            </p>
          )}
        </CardContent>
      </Card>

      {/* 予算消化率 */}
      {hasBudget && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">予算消化率</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetProgressBar data={data.budget} />
          </CardContent>
        </Card>
      )}

      {/* 夫婦負担比率 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">夫婦負担比率</CardTitle>
        </CardHeader>
        <CardContent>
          <CoupleRatioChart data={data.coupleRatio} />
        </CardContent>
      </Card>

      {/* カテゴリTOP5 横棒グラフ */}
      {top5.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">カテゴリ別 TOP5</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={top5Config} className="h-[200px] w-full sm:h-[240px]">
              <BarChart data={top5} layout="vertical" accessibilityLayer margin={{ left: 4, right: 12 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickFormatter={(v: number) => formatJPY(v)} />
                <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        formatJPY(typeof value === "number" ? value : Number(value))
                      }
                    />
                  }
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {top5.map((entry) => (
                    <Cell key={entry.categoryKey} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* AI家計分析 */}
      <AIReportCard yearMonth={yearMonth} aiAvailable={aiAvailable} />
    </div>
  )
}

// ─── カテゴリタブ ─────────────────────────────────────

function CategoryTab({ data }: Props) {
  return (
    <div className="space-y-4">
      {/* 円グラフ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">カテゴリ別支出</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryPieChart data={data.categories} />
        </CardContent>
      </Card>

      {/* カテゴリ詳細一覧 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">カテゴリ詳細</CardTitle>
        </CardHeader>
        <CardContent>
          {data.categories.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              データがありません
            </p>
          ) : (
            <div className="divide-y">
              {data.categories.map((cat) => (
                <div
                  key={cat.categoryId ?? "uncategorized"}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {cat.categoryIcon && (
                      <span className="text-sm">{cat.categoryIcon}</span>
                    )}
                    <span className="text-sm truncate">
                      {cat.categoryName ?? "未分類"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-medium">
                      {formatJPY(cat.amount)}
                    </span>
                    <span className="w-12 text-right text-xs text-muted-foreground">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 予算 vs 実績（カテゴリ別） */}
      {data.budget.categories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">予算 vs 実績</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {data.budget.categories
                .filter((c) => c.budget > 0)
                .map((cat) => {
                  const rate = cat.budget > 0 ? Math.round((cat.spent / cat.budget) * 100) : 0
                  const isOver = cat.spent > cat.budget
                  return (
                    <div key={cat.categoryId ?? "total"} className="py-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{cat.categoryName ?? "全体"}</span>
                        <span className={isOver ? "text-destructive font-medium" : ""}>
                          {formatJPY(cat.spent)} / {formatJPY(cat.budget)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className={`h-1.5 rounded-full transition-[width] duration-500 ${
                            isOver ? "bg-destructive" : rate >= 80 ? "bg-orange-500" : "bg-primary"
                          }`}
                          style={{ width: `${Math.min(rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── 推移タブ ─────────────────────────────────────────

function TrendTab({ data }: Props) {
  return (
    <div className="space-y-4">
      {/* 月次支出推移 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">月次支出推移</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyBarChart
            data={data.trend}
            budgetLine={data.budget.totalBudget > 0 ? data.budget.totalBudget : undefined}
          />
        </CardContent>
      </Card>

      {/* カテゴリ別推移 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">カテゴリ別推移（TOP5）</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryTrendChart data={data.categoryTrend} />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export function ReviewClient({ data, yearMonth, aiAvailable }: Props) {
  return (
    <Tabs defaultValue="summary" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="summary">サマリー</TabsTrigger>
        <TabsTrigger value="category">カテゴリ</TabsTrigger>
        <TabsTrigger value="trend">推移</TabsTrigger>
      </TabsList>
      <TabsContent value="summary">
        <SummaryTab data={data} yearMonth={yearMonth} aiAvailable={aiAvailable} />
      </TabsContent>
      <TabsContent value="category">
        <CategoryTab data={data} yearMonth={yearMonth} aiAvailable={aiAvailable} />
      </TabsContent>
      <TabsContent value="trend">
        <TrendTab data={data} yearMonth={yearMonth} aiAvailable={aiAvailable} />
      </TabsContent>
    </Tabs>
  )
}
