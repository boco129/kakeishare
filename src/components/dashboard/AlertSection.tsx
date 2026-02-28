"use client"

import { AlertTriangle, FileWarning, ClipboardList } from "lucide-react"
import type { CsvImportStatus, BudgetSummary } from "@/lib/dashboard"

type Props = {
  csvImport: CsvImportStatus
  budget: BudgetSummary
}

type Alert = {
  icon: React.ReactNode
  message: string
  variant: "warning" | "info"
}

export function AlertSection({ csvImport, budget }: Props) {
  const alerts: Alert[] = []

  // CSV未取込アラート
  if (csvImport.unimportedMonths.length > 0) {
    alerts.push({
      icon: <FileWarning className="h-4 w-4 text-destructive" />,
      message: `CSV未取込の月があります（${csvImport.unimportedMonths.length}件）`,
      variant: "warning",
    })
  }

  // 未確認支出アラート
  if (csvImport.pendingConfirmCount > 0) {
    alerts.push({
      icon: <ClipboardList className="h-4 w-4 text-amber-500" />,
      message: `未確認の支出が${csvImport.pendingConfirmCount}件あります`,
      variant: "info",
    })
  }

  // 予算警告（80%超過カテゴリ）
  for (const cat of budget.categories) {
    if (cat.budget > 0 && cat.spent / cat.budget >= 0.8) {
      const rate = Math.round((cat.spent / cat.budget) * 100)
      alerts.push({
        icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
        message: `${cat.categoryName ?? "未分類"}が予算の${rate}%到達`,
        variant: "warning",
      })
    }
  }

  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm"
        >
          {alert.icon}
          <span>{alert.message}</span>
        </div>
      ))}
    </div>
  )
}
