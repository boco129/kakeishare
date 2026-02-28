import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CategoryPieChart } from "@/components/charts/CategoryPieChart"
import { CategoryTrendChart } from "@/components/charts/CategoryTrendChart"
import { MonthlyBarChart } from "@/components/charts/MonthlyBarChart"
import { CoupleRatioChart } from "@/components/charts/CoupleRatioChart"
import { BudgetProgressBar } from "@/components/charts/BudgetProgressBar"
import type {
  CategoryBreakdown,
  CategoryTrendEntry,
  MonthlyTrend,
  CoupleRatio,
  BudgetSummary,
} from "@/lib/dashboard"

// --- CategoryPieChart ---

describe("CategoryPieChart", () => {
  it("空データでは「データがありません」を表示", () => {
    render(<CategoryPieChart data={[]} />)
    expect(screen.getByText("データがありません")).toBeInTheDocument()
  })

  it("データありでPieChartを描画", () => {
    const data: CategoryBreakdown[] = [
      {
        categoryId: "food",
        categoryName: "食費",
        categoryIcon: null,
        amount: 12000,
        percentage: 50,
        count: 3,
      },
    ]
    render(<CategoryPieChart data={data} />)
    expect(screen.getByTestId("recharts-PieChart")).toBeInTheDocument()
  })
})

// --- CategoryTrendChart ---

describe("CategoryTrendChart", () => {
  it("空データでは「データがありません」を表示", () => {
    render(<CategoryTrendChart data={[]} />)
    expect(screen.getByText("データがありません")).toBeInTheDocument()
  })

  it("categoriesが空配列でも「データがありません」を表示", () => {
    const data: CategoryTrendEntry[] = [
      { yearMonth: "2026-01", categories: [] },
    ]
    render(<CategoryTrendChart data={data} />)
    expect(screen.getByText("データがありません")).toBeInTheDocument()
  })

  it("正常データでLineChartを描画", () => {
    const data: CategoryTrendEntry[] = [
      {
        yearMonth: "2026-01",
        categories: [{ categoryId: "food", categoryName: "食費", amount: 10000 }],
      },
    ]
    render(<CategoryTrendChart data={data} />)
    expect(screen.getByTestId("recharts-LineChart")).toBeInTheDocument()
  })

  it("1ヶ月目が空でも2ヶ月目以降にカテゴリがあればLineChartを描画", () => {
    const data: CategoryTrendEntry[] = [
      { yearMonth: "2026-01", categories: [] },
      {
        yearMonth: "2026-02",
        categories: [{ categoryId: "food", categoryName: "食費", amount: 15000 }],
      },
    ]
    render(<CategoryTrendChart data={data} />)
    expect(screen.getByTestId("recharts-LineChart")).toBeInTheDocument()
  })
})

// --- MonthlyBarChart ---

describe("MonthlyBarChart", () => {
  it("空データでは「データがありません」を表示", () => {
    render(<MonthlyBarChart data={[]} />)
    expect(screen.getByText("データがありません")).toBeInTheDocument()
  })

  it("正常データでBarChartを描画", () => {
    const data: MonthlyTrend[] = [{ yearMonth: "2026-01", total: 100000 }]
    render(<MonthlyBarChart data={data} />)
    expect(screen.getByTestId("recharts-BarChart")).toBeInTheDocument()
  })

  it("budgetLine未指定ではReferenceLineなし", () => {
    const data: MonthlyTrend[] = [{ yearMonth: "2026-01", total: 100000 }]
    render(<MonthlyBarChart data={data} />)
    expect(screen.queryByTestId("recharts-ReferenceLine")).not.toBeInTheDocument()
  })

  it("budgetLine指定でReferenceLineが描画される", () => {
    const data: MonthlyTrend[] = [{ yearMonth: "2026-01", total: 100000 }]
    render(<MonthlyBarChart data={data} budgetLine={120000} />)
    expect(screen.getByTestId("recharts-ReferenceLine")).toBeInTheDocument()
  })
})

// --- CoupleRatioChart ---

describe("CoupleRatioChart", () => {
  it("合計0では「データがありません」を表示", () => {
    const data: CoupleRatio = {
      user: { userId: "u1", name: "太郎", total: 0, percentage: 0 },
      partner: { userId: "u2", name: "花子", total: 0, percentage: 0 },
    }
    render(<CoupleRatioChart data={data} />)
    expect(screen.getByText("データがありません")).toBeInTheDocument()
  })

  it("正常データで名前と金額を表示", () => {
    const data: CoupleRatio = {
      user: { userId: "u1", name: "太郎", total: 70000, percentage: 70 },
      partner: { userId: "u2", name: "花子", total: 30000, percentage: 30 },
    }
    render(<CoupleRatioChart data={data} />)
    expect(screen.getByText(/太郎:/)).toBeInTheDocument()
    expect(screen.getByText(/花子:/)).toBeInTheDocument()
  })
})

// --- BudgetProgressBar ---

describe("BudgetProgressBar", () => {
  const emptyBudget: BudgetSummary = {
    totalBudget: 0,
    totalSpent: 0,
    remainingBudget: 0,
    budgetUsageRate: 0,
    categories: [],
  }

  it("予算0では「予算が設定されていません」を表示", () => {
    render(<BudgetProgressBar data={emptyBudget} />)
    expect(screen.getByText("予算が設定されていません")).toBeInTheDocument()
  })

  it("正常データでprogressbarを描画", () => {
    const data: BudgetSummary = {
      totalBudget: 100000,
      totalSpent: 65000,
      remainingBudget: 35000,
      budgetUsageRate: 65,
      categories: [],
    }
    render(<BudgetProgressBar data={data} />)
    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "65")
  })

  it("100%超過時はaria-valuenowが100にクランプ", () => {
    const data: BudgetSummary = {
      totalBudget: 100000,
      totalSpent: 120000,
      remainingBudget: -20000,
      budgetUsageRate: 120,
      categories: [],
    }
    render(<BudgetProgressBar data={data} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")
  })
})
