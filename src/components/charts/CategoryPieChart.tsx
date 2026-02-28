"use client"

import { Pie, PieChart, Cell } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { colorByCategoryKey } from "@/lib/chart-colors"
import { formatJPY } from "@/lib/chart-format"
import type { CategoryBreakdown } from "@/lib/dashboard"

type Props = {
  data: CategoryBreakdown[]
}

export function CategoryPieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground sm:h-[260px]">
        データがありません
      </div>
    )
  }

  // chartConfig を動的に生成
  const chartConfig: ChartConfig = Object.fromEntries(
    data.map((d) => [
      d.categoryId ?? "uncategorized",
      {
        label: d.categoryName ?? "未分類",
        color: colorByCategoryKey(d.categoryId),
      },
    ]),
  )

  const chartData = data.map((d) => ({
    name: d.categoryName ?? "未分類",
    value: d.amount,
    categoryKey: d.categoryId ?? "uncategorized",
    fill: colorByCategoryKey(d.categoryId),
  }))

  return (
    <ChartContainer
      config={chartConfig}
      className="h-[220px] w-full sm:h-[260px]"
    >
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
        >
          {chartData.map((entry) => (
            <Cell key={entry.categoryKey} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip
          formatter={(value: number | string) =>
            formatJPY(typeof value === "number" ? value : Number(value))
          }
        />
        <ChartLegend content={<ChartLegendContent nameKey="categoryKey" />} />
      </PieChart>
    </ChartContainer>
  )
}
