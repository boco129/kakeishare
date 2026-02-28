"use client"

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatJPY } from "@/lib/chart-format"
import type { MonthlyTrend } from "@/lib/dashboard"

type Props = {
  data: MonthlyTrend[]
  /** 予算ラインの金額（点線表示） */
  budgetLine?: number
}

const chartConfig = {
  total: {
    label: "支出合計",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

/** YYYY-MM → M月 の短縮表示 */
function formatMonth(yearMonth: string) {
  const month = Number(yearMonth.split("-")[1])
  return Number.isInteger(month) && month >= 1 && month <= 12
    ? `${month}月`
    : yearMonth
}

export function MonthlyBarChart({ data, budgetLine }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground sm:h-[300px]">
        データがありません
      </div>
    )
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="h-[240px] w-full sm:h-[300px]"
    >
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="yearMonth"
          tickLine={false}
          axisLine={false}
          tickFormatter={formatMonth}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatJPY(v)}
          width={70}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={formatMonth}
              formatter={(value) =>
                formatJPY(typeof value === "number" ? value : Number(value))
              }
            />
          }
        />
        {Number.isFinite(budgetLine) && (
          <ReferenceLine
            y={budgetLine}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
          />
        )}
        <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
