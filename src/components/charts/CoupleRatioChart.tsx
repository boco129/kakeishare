"use client"

import { Bar, BarChart, XAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatJPY } from "@/lib/chart-format"
import type { CoupleRatio } from "@/lib/dashboard"

type Props = {
  data: CoupleRatio
}

export function CoupleRatioChart({ data }: Props) {
  const total = data.user.total + data.partner.total
  if (total === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-muted-foreground">
        データがありません
      </div>
    )
  }

  const chartConfig = {
    user: {
      label: data.user.name,
      color: "var(--chart-1)",
    },
    partner: {
      label: data.partner.name,
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig

  const chartData = [
    {
      category: "支出比率",
      user: data.user.total,
      partner: data.partner.total,
    },
  ]

  return (
    <div className="space-y-2">
      <ChartContainer config={chartConfig} className="h-[80px] w-full">
        <BarChart data={chartData} layout="vertical" accessibilityLayer>
          <XAxis type="number" hide />
          <ChartTooltip
            formatter={(value: number | string) =>
              formatJPY(typeof value === "number" ? value : Number(value))
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="user"
            stackId="ratio"
            fill="var(--color-user)"
            radius={[4, 0, 0, 4]}
          />
          <Bar
            dataKey="partner"
            stackId="ratio"
            fill="var(--color-partner)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ChartContainer>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {data.user.name}: {formatJPY(data.user.total)} ({Math.round(data.user.percentage)}%)
        </span>
        <span>
          {data.partner.name}: {formatJPY(data.partner.total)} ({Math.round(data.partner.percentage)}%)
        </span>
      </div>
    </div>
  )
}
