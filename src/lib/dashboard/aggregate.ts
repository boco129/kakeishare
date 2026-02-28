// ダッシュボード集計ドメイン — 集計関数群

import { db } from "@/lib/db"
import { CARD_OWNERS } from "@/lib/csv"
import type {
  MonthRange,
  MonthlyAggregate,
  CategoryBreakdown,
  CoupleRatio,
  MonthlyTrend,
  BudgetSummary,
  BudgetCategorySummary,
  InstallmentSummary,
  InstallmentItem,
  CsvImportStatus,
} from "./types"

// ============================================================
// ユーティリティ
// ============================================================

/** YYYY-MM → 月初〜翌月初の Date 範囲（UTC） */
export function toMonthRange(yearMonth: string): MonthRange {
  const [y, m] = yearMonth.split("-").map(Number)
  return {
    start: new Date(y, m - 1, 1),
    end: new Date(y, m, 1),
  }
}

/** 現在月から N ヶ月前までの YYYY-MM 配列（降順） */
export function getPastMonths(months: number, baseYearMonth?: string): string[] {
  const now = baseYearMonth
    ? (() => {
        const [y, m] = baseYearMonth.split("-").map(Number)
        return new Date(y, m - 1, 1)
      })()
    : new Date()
  const result: string[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    )
  }
  return result
}

/** 月次 WHERE 条件 */
function monthWhere(yearMonth: string): { gte: Date; lt: Date } {
  const { start, end } = toMonthRange(yearMonth)
  return { gte: start, lt: end }
}

// ============================================================
// 月次支出集計
// ============================================================

/**
 * 月次支出集計（家計全体）
 *
 * 集計にはプライバシーに関わらず全支出を含める。
 * CATEGORY_TOTAL の支出も家計合計に反映する。
 */
export async function aggregateMonthlyExpenses(
  yearMonth: string,
): Promise<MonthlyAggregate> {
  const result = await db.expense.aggregate({
    where: { date: monthWhere(yearMonth) },
    _sum: { amount: true },
    _count: { _all: true },
  })

  return {
    yearMonth,
    totalAmount: result._sum.amount ?? 0,
    count: result._count._all,
  }
}

// ============================================================
// カテゴリ別集計
// ============================================================

/**
 * カテゴリ別支出集計
 *
 * 集計対象:
 * - 自分の支出: 全件
 * - 相手の支出: 全件（CATEGORY_TOTAL含む — 金額は家計に反映すべき）
 *
 * 明細の可視/不可視はAPIルート層の責務。ここでは金額集計のみ行う。
 */
export async function aggregateByCategoryForMonth(
  yearMonth: string,
): Promise<CategoryBreakdown[]> {
  const grouped = await db.expense.groupBy({
    by: ["categoryId"],
    where: { date: monthWhere(yearMonth) },
    _sum: { amount: true },
    _count: { _all: true },
  })

  // カテゴリ情報を取得
  const categoryIds = grouped
    .map((g) => g.categoryId)
    .filter((id): id is string => id !== null)

  const categories = categoryIds.length
    ? await db.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, icon: true },
      })
    : []

  const catMap = new Map(categories.map((c) => [c.id, c]))
  const totalAmount = grouped.reduce(
    (sum, g) => sum + (g._sum.amount ?? 0),
    0,
  )

  return grouped
    .map((g) => {
      const amount = g._sum.amount ?? 0
      const cat = g.categoryId ? catMap.get(g.categoryId) : null
      return {
        categoryId: g.categoryId,
        categoryName: cat?.name ?? null,
        categoryIcon: cat?.icon ?? null,
        amount,
        percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 1000) / 10 : 0,
        count: g._count._all,
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

// ============================================================
// 夫婦比率
// ============================================================

/**
 * 夫婦支出比率
 *
 * 比率計算は明細を返さないため、visibility を絞らず全支出で集計する。
 */
export async function calcCoupleRatio(
  yearMonth: string,
  userId: string,
): Promise<CoupleRatio> {
  const rows = await db.expense.groupBy({
    by: ["userId"],
    where: { date: monthWhere(yearMonth) },
    _sum: { amount: true },
  })

  // ユーザー名を取得
  const userIds = rows.map((r) => r.userId)
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u.name]))

  const grandTotal = rows.reduce((sum, r) => sum + (r._sum.amount ?? 0), 0)

  const myRow = rows.find((r) => r.userId === userId)
  const partnerRow = rows.find((r) => r.userId !== userId)

  const myTotal = myRow?._sum.amount ?? 0
  const partnerTotal = partnerRow?._sum.amount ?? 0

  return {
    user: {
      userId,
      name: userMap.get(userId) ?? "",
      total: myTotal,
      percentage:
        grandTotal > 0
          ? Math.round((myTotal / grandTotal) * 1000) / 10
          : 0,
    },
    partner: {
      userId: partnerRow?.userId ?? "",
      name: partnerRow?.userId
        ? (userMap.get(partnerRow.userId) ?? "")
        : "",
      total: partnerTotal,
      percentage:
        grandTotal > 0
          ? Math.round((partnerTotal / grandTotal) * 1000) / 10
          : 0,
    },
  }
}

// ============================================================
// 月次トレンド
// ============================================================

/**
 * 直近 N ヶ月の月次支出トレンド
 *
 * 全 visibility の支出を含める（家計全体のトレンド）
 */
export async function aggregateMonthlyTrend(
  months: number,
  baseYearMonth?: string,
): Promise<MonthlyTrend[]> {
  if (months <= 0) return []

  const yearMonths = getPastMonths(months, baseYearMonth)

  // 全期間の start/end を計算
  const oldest = yearMonths[yearMonths.length - 1]
  const newest = yearMonths[0]
  const { start } = toMonthRange(oldest)
  const { end } = toMonthRange(newest)

  const expenses = await db.expense.findMany({
    where: { date: { gte: start, lt: end } },
    select: { date: true, amount: true },
  })

  // yearMonth ごとに集計
  const monthMap = new Map<string, number>()
  for (const ym of yearMonths) {
    monthMap.set(ym, 0)
  }
  for (const e of expenses) {
    const d = e.date
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (monthMap.has(ym)) {
      monthMap.set(ym, monthMap.get(ym)! + e.amount)
    }
  }

  // 昇順（古い月→新しい月）で返却
  return yearMonths
    .reverse()
    .map((ym) => ({ yearMonth: ym, total: monthMap.get(ym) ?? 0 }))
}

// ============================================================
// 予算サマリー
// ============================================================

/**
 * 予算 vs 実績サマリー
 *
 * 実績集計は全 visibility を含める（家計全体の予算管理のため）
 */
export async function getBudgetSummary(
  yearMonth: string,
): Promise<BudgetSummary> {
  // 予算一覧
  const budgets = await db.budget.findMany({
    where: { yearMonth },
    include: { category: { select: { name: true } } },
  })

  // カテゴリ別実績
  const grouped = await db.expense.groupBy({
    by: ["categoryId"],
    where: { date: monthWhere(yearMonth) },
    _sum: { amount: true },
  })
  const spentMap = new Map(
    grouped.map((g) => [g.categoryId, g._sum.amount ?? 0]),
  )

  // 全体予算（categoryId = null）
  const overallBudget = budgets.find((b) => b.categoryId === null)
  const categoryBudgets = budgets.filter((b) => b.categoryId !== null)

  // 全実績合計
  const totalSpent = grouped.reduce(
    (sum, g) => sum + (g._sum.amount ?? 0),
    0,
  )

  // 全体予算がない場合はカテゴリ予算の合算
  const totalBudget =
    overallBudget?.amount ??
    categoryBudgets.reduce((sum, b) => sum + b.amount, 0)

  const remainingBudget = totalBudget - totalSpent

  const categories: BudgetCategorySummary[] = categoryBudgets.map((b) => {
    const spent = spentMap.get(b.categoryId!) ?? 0
    return {
      categoryId: b.categoryId,
      categoryName: b.category?.name ?? null,
      budget: b.amount,
      spent,
      remaining: b.amount - spent,
    }
  })

  return {
    totalBudget,
    totalSpent,
    remainingBudget,
    budgetUsageRate:
      totalBudget > 0
        ? Math.round((totalSpent / totalBudget) * 1000) / 10
        : 0,
    categories,
  }
}

// ============================================================
// 分割払いサマリー
// ============================================================

const INSTALLMENT_PRIVATE_LABEL = "個人支出" as const

/**
 * 分割払いサマリー
 *
 * プライバシー処理:
 * - 自分の分割払い: 全フィールド表示
 * - 相手の PUBLIC: 全フィールド表示
 * - 相手の AMOUNT_ONLY: description をマスク
 * - 相手の CATEGORY_TOTAL: items に含めず、集計（activeCount/totalMonthlyAmount）のみ反映
 */
export async function getInstallmentSummary(
  userId: string,
): Promise<InstallmentSummary> {
  const installments = await db.installment.findMany({
    where: { remainingMonths: { gt: 0 } },
    include: { user: { select: { id: true } } },
  })

  let activeCount = 0
  let totalMonthlyAmount = 0
  let totalRemainingAmount = 0
  const items: InstallmentItem[] = []

  for (const inst of installments) {
    const isOwn = inst.userId === userId
    const remainingAmount = inst.monthlyAmount * inst.remainingMonths
    activeCount += 1
    totalMonthlyAmount += inst.monthlyAmount
    totalRemainingAmount += remainingAmount
    const progressRate =
      inst.totalMonths > 0
        ? Math.round(
            ((inst.totalMonths - inst.remainingMonths) / inst.totalMonths) *
              1000,
          ) / 10
        : 0

    if (isOwn || inst.visibility === "PUBLIC") {
      items.push({
        id: inst.id,
        description: inst.description,
        totalAmount: inst.totalAmount,
        monthlyAmount: inst.monthlyAmount,
        remainingMonths: inst.remainingMonths,
        remainingAmount,
        progressRate,
        visibility: inst.visibility,
      })
    } else if (inst.visibility === "AMOUNT_ONLY") {
      items.push({
        id: inst.id,
        description: INSTALLMENT_PRIVATE_LABEL,
        totalAmount: inst.totalAmount,
        monthlyAmount: inst.monthlyAmount,
        remainingMonths: inst.remainingMonths,
        remainingAmount,
        progressRate,
        visibility: inst.visibility,
      })
    }
    // CATEGORY_TOTAL: items に含めない（集計のみ）
  }

  return { activeCount, totalMonthlyAmount, totalRemainingAmount, items }
}

// ============================================================
// CSV取り込みステータス
// ============================================================

/**
 * CSV取り込みステータス
 *
 * 指定月の取り込み状況を返す
 */
export async function getCsvImportStatus(
  yearMonth: string,
): Promise<CsvImportStatus> {
  // 最新の取り込み履歴
  const latestImport = await db.csvImport.findFirst({
    orderBy: { importedAt: "desc" },
    select: { importedAt: true },
  })

  // 指定月の未確認支出数
  const pendingConfirmCount = await db.expense.count({
    where: {
      date: monthWhere(yearMonth),
      confirmed: false,
      source: "CSV_IMPORT",
    },
  })

  // 未取り込み月の検出: CARD_OWNERS の全カード×ユーザーで取り込みがあるかチェック
  const imports = await db.csvImport.findMany({
    where: { yearMonth },
    select: { userId: true, cardType: true },
  })
  const importedSet = new Set(
    imports.map((i) => `${i.userId}:${i.cardType}`),
  )

  const allImported = CARD_OWNERS.every((pair) =>
    importedSet.has(`${pair.userId}:${pair.cardType}`),
  )

  const unimportedMonths: string[] = []
  if (!allImported) {
    unimportedMonths.push(yearMonth)
  }

  return {
    lastImportDate: latestImport?.importedAt ?? null,
    pendingConfirmCount,
    unimportedMonths,
  }
}
