"use client"

import Link from "next/link"
import { CreditCard } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatJPY } from "@/lib/chart-format"
import type { InstallmentSummary } from "@/lib/dashboard"

type Props = {
  data: InstallmentSummary
}

export function InstallmentSummaryCard({ data }: Props) {
  if (data.activeCount === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4" />
          分割払い
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{data.activeCount}件の支払い中</span>
          <span className="font-medium">月額 {formatJPY(data.totalMonthlyAmount)}</span>
        </div>
        {data.items.length > 0 && (
          <ul className="mt-2 space-y-1">
            {data.items.slice(0, 3).map((item) => (
              <li key={item.id} className="flex justify-between text-xs text-muted-foreground">
                <span className="truncate">{item.description}</span>
                <span className="shrink-0 ml-2">
                  残{item.remainingMonths}回 / {formatJPY(item.remainingAmount)}
                </span>
              </li>
            ))}
            {data.items.length > 3 && (
              <li className="text-xs text-muted-foreground">
                他 {data.items.length - 3}件
              </li>
            )}
          </ul>
        )}
        <div className="mt-3 flex items-center justify-between border-t pt-2">
          <span className="text-sm font-semibold text-destructive">
            残債合計 {formatJPY(data.totalRemainingAmount)}
          </span>
          <Link href="/settings/installments" className="text-sm text-primary hover:underline">
            詳細 →
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
