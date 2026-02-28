import { describe, expect, it, vi, beforeEach } from "vitest"

// モック設定 — $transaction はコールバックに tx（= db自身）を渡して実行する
vi.mock("@/lib/db", () => {
  const dbObj: Record<string, unknown> = {
    expense: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    category: { findMany: vi.fn() },
    csvImport: { update: vi.fn() },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(dbObj)),
  }
  return { db: dbObj }
})

vi.mock("@/lib/ai", () => ({
  isAIAvailable: vi.fn(),
}))

vi.mock("@/lib/ai/classify", () => ({
  classifyExpenses: vi.fn(),
}))

vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: "file:./prisma/test.db",
    AUTH_SECRET: "test-secret-that-is-at-least-32-chars-long",
    ANTHROPIC_API_KEY: "sk-test-key",
  },
}))

vi.mock("./unconfirmed-count", () => ({
  recalcUnconfirmedCount: vi.fn(),
}))

import { db } from "@/lib/db"
import { isAIAvailable } from "@/lib/ai"
import { classifyExpenses } from "@/lib/ai/classify"
import { recalcUnconfirmedCount } from "./unconfirmed-count"
import { runAiClassificationStep } from "./ai-classify-step"
import { Visibility } from "@/generated/prisma/enums"

const mockIsAIAvailable = vi.mocked(isAIAvailable)
const mockClassifyExpenses = vi.mocked(classifyExpenses)
const mockExpenseFindMany = vi.mocked(db.expense.findMany)
const mockCategoryFindMany = vi.mocked(db.category.findMany)
const mockRecalcUnconfirmedCount = vi.mocked(recalcUnconfirmedCount)

describe("runAiClassificationStep", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("AI未設定時は null を返す", async () => {
    mockIsAIAvailable.mockReturnValue(false)

    const result = await runAiClassificationStep("import1", "user1")

    expect(result).toBeNull()
    expect(mockExpenseFindMany).not.toHaveBeenCalled()
  })

  it("expense が 0件の場合は null を返す", async () => {
    mockIsAIAvailable.mockReturnValue(true)
    mockExpenseFindMany.mockResolvedValue([])

    const result = await runAiClassificationStep("import1", "user1")

    expect(result).toBeNull()
  })

  it("正常にAI分類を実行し結果を返す", async () => {
    mockIsAIAvailable.mockReturnValue(true)
    mockExpenseFindMany.mockResolvedValue([
      { id: "exp1", description: "イオン", amount: 3000, date: new Date("2026-01-15") },
      { id: "exp2", description: "居酒屋", amount: 5000, date: new Date("2026-01-16") },
    ] as never)
    mockCategoryFindMany.mockResolvedValue([
      { id: "cat1", name: "食費", defaultVisibility: Visibility.PUBLIC },
    ] as never)
    mockClassifyExpenses.mockResolvedValue([
      {
        expenseId: "exp1",
        categoryId: "cat1",
        confidence: "high",
        suggestedVisibility: Visibility.PUBLIC,
        confirmed: true,
      },
      {
        expenseId: "exp2",
        categoryId: "cat1",
        confidence: "low",
        suggestedVisibility: Visibility.PUBLIC,
        confirmed: false,
      },
    ])

    const result = await runAiClassificationStep("import1", "user1")

    expect(result).toEqual({
      classifiedCount: 2,
      unconfirmedCount: 1,
    })
    expect(mockRecalcUnconfirmedCount).toHaveBeenCalledWith(expect.anything(), "import1")
  })

  it("classifyExpenses エラー時は null を返す", async () => {
    mockIsAIAvailable.mockReturnValue(true)
    mockExpenseFindMany.mockResolvedValue([
      { id: "exp1", description: "test", amount: 100, date: new Date() },
    ] as never)
    mockCategoryFindMany.mockResolvedValue([])
    mockClassifyExpenses.mockRejectedValue(new Error("API failure"))

    const result = await runAiClassificationStep("import1", "user1")

    expect(result).toBeNull()
  })
})
