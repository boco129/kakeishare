"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { colorByCategoryKey } from "@/lib/chart-colors"
import { formatJPY } from "@/lib/chart-format"
import type { CategoryTrendEntry } from "@/lib/dashboard"

type Props = {
  data: CategoryTrendEntry[]
}

/** YYYY-MM → M月 の短縮表示 */
function formatMonth(yearMonth: string) {
  const month = Number(yearMonth.split("-")[1])
  return Number.isInteger(month) && month >= 1 && month <= 12
    ? `${month}月`
    : yearMonth
}

export function CategoryTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground sm:h-[300px]">
        データがありません
      </div>
    )
  }

  // 全月のカテゴリ集合からユニークなキーを取得
  const seen = new Set<string>()
  const categoryKeys: { id: string; name: string }[] = []
  for (const entry of data) {
    for (const c of entry.categories) {
      if (!seen.has(c.categoryId)) {
        seen.add(c.categoryId)
        categoryKeys.push({ id: c.categoryId, name: c.categoryName })
      }
    }
  }

  if (categoryKeys.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground sm:h-[300px]">
        データがありません
      </div>
    )
  }

  // chartConfig
  const chartConfig: ChartConfig = Object.fromEntries(
    categoryKeys.map((c) => [
      c.id,
      { label: c.name, color: colorByCategoryKey(c.id) },
    ]),
  )

  // Rechartsデータ: { yearMonth, [categoryId]: amount }
  const chartData = data.map((entry) => {
    const row: Record<string, string | number> = { yearMonth: entry.yearMonth }
    for (const c of entry.categories) {
      row[c.categoryId] = c.amount
    }
    return row
  })

  return (
    <ChartContainer
      config={chartConfig}
      className="h-[240px] w-full sm:h-[300px]"
    >
      <LineChart data={chartData} accessibilityLayer>
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
          formatter={(value: number | string) =>
            formatJPY(typeof value === "number" ? value : Number(value))
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {categoryKeys.map((c) => (
          <Line
            key={c.id}
            type="monotone"
            dataKey={c.id}
            stroke={colorByCategoryKey(c.id)}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
