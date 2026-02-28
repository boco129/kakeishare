"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CategoryPieChart, MonthlyBarChart, CoupleRatioChart } from "@/components/charts"
import { MonthlySummaryCard } from "./MonthlySummaryCard"
import { BudgetCard } from "./BudgetCard"
import { AlertSection } from "./AlertSection"
import { InstallmentSummaryCard } from "./InstallmentSummaryCard"
import type { DashboardSummary } from "@/lib/dashboard"

type Props = {
  data: DashboardSummary
}

export function DashboardClient({ data }: Props) {
  return (
    <div className="space-y-4">
      {/* 予算カード */}
      <BudgetCard data={data.budget} />

      {/* 今月支出 + 前月比 */}
      <MonthlySummaryCard
        totalAmount={data.monthly.totalAmount}
        count={data.monthly.count}
        comparison={data.monthlyComparison}
      />

      {/* アラートセクション */}
      <AlertSection csvImport={data.csvImport} budget={data.budget} />

      {/* カテゴリ別円グラフ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">カテゴリ別支出</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryPieChart data={data.categories} />
        </CardContent>
      </Card>

      {/* 夫婦比率 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">夫婦比率</CardTitle>
        </CardHeader>
        <CardContent>
          <CoupleRatioChart data={data.coupleRatio} />
        </CardContent>
      </Card>

      {/* 月次推移棒グラフ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">月次推移</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyBarChart
            data={data.trend}
            budgetLine={data.budget.totalBudget > 0 ? data.budget.totalBudget : undefined}
          />
        </CardContent>
      </Card>

      {/* 分割払いサマリー */}
      <InstallmentSummaryCard data={data.installment} />
    </div>
  )
}
