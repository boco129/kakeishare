import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BudgetManager } from "@/components/settings/budget-manager"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { toMonthRange } from "@/lib/dashboard"

/** 現在の YYYY-MM を返す */
function getCurrentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export default async function BudgetsPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === "ADMIN"
  const yearMonth = getCurrentYearMonth()

  // カテゴリ一覧
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, icon: true },
  })

  // 当月予算
  const budgets = await db.budget.findMany({
    where: { yearMonth },
    include: { category: { select: { id: true, name: true, icon: true } } },
  })

  // 前月の YYYY-MM
  const [y, m] = yearMonth.split("-").map(Number)
  const prevDate = new Date(y, m - 2, 1)
  const prevYearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`

  // 前月実績
  const { start: prevStart, end: prevEnd } = toMonthRange(prevYearMonth)
  const prevGrouped = await db.expense.groupBy({
    by: ["categoryId"],
    where: { date: { gte: prevStart, lt: prevEnd } },
    _sum: { amount: true },
  })
  const prevSpentMap = new Map(
    prevGrouped.map((g) => [g.categoryId, g._sum.amount ?? 0]),
  )
  const prevTotalSpent = prevGrouped.reduce(
    (sum, g) => sum + (g._sum.amount ?? 0),
    0,
  )

  // 全体予算データ
  const overallBudget = budgets.find((b) => b.categoryId === null)
  const overallData = {
    id: overallBudget?.id ?? null,
    amount: overallBudget?.amount ?? 0,
    prevSpent: prevTotalSpent,
  }

  // カテゴリ別予算の Map
  const budgetMap = new Map(
    budgets
      .filter((b) => b.categoryId !== null)
      .map((b) => [b.categoryId!, { id: b.id, amount: b.amount }]),
  )

  // 全カテゴリ分の行データ（未設定は0円）
  const rows = categories.map((cat) => {
    const budget = budgetMap.get(cat.id)
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      categoryIcon: cat.icon,
      budgetId: budget?.id ?? null,
      amount: budget?.amount ?? 0,
      prevSpent: prevSpentMap.get(cat.id) ?? 0,
    }
  })

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            設定
          </Link>
        </div>
        <h1 className="text-2xl font-bold">予算設定</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">月次予算</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetManager
              isAdmin={isAdmin}
              initialYearMonth={yearMonth}
              initialOverall={overallData}
              initialRows={rows}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
