"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BudgetProgressBar } from "@/components/charts"
import { formatJPY } from "@/lib/chart-format"
import type { BudgetSummary } from "@/lib/dashboard"

type Props = {
  data: BudgetSummary
}

export function BudgetCard({ data }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">予算</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.totalBudget > 0 ? (
          <>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">残り予算</p>
              <p className={`text-2xl font-bold ${data.remainingBudget < 0 ? "text-destructive" : ""}`}>
                {formatJPY(data.remainingBudget)}
              </p>
            </div>
            <BudgetProgressBar data={data} />
          </>
        ) : (
          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">予算が設定されていません</p>
            <Button asChild size="sm">
              <Link href="/settings#budget">予算を設定してください</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
