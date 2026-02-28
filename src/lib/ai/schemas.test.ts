import { describe, expect, it } from "vitest"
import {
  aiCategoryOutputSchema,
  aiCategoryBatchOutputSchema,
  aiInsightsOutputSchema,
} from "./schemas"

describe("aiCategoryOutputSchema", () => {
  it("有効なレスポンスを受け入れる", () => {
    const result = aiCategoryOutputSchema.safeParse({
      category: "食費",
      confidence: "high",
      reasoning: "スターバックスは飲食店",
    })
    expect(result.success).toBe(true)
  })

  it("reasoning なしでも有効", () => {
    const result = aiCategoryOutputSchema.safeParse({
      category: "交通費",
      confidence: "medium",
    })
    expect(result.success).toBe(true)
  })

  it("空カテゴリを拒否する", () => {
    const result = aiCategoryOutputSchema.safeParse({
      category: "",
      confidence: "high",
    })
    expect(result.success).toBe(false)
  })

  it("不正な confidence を拒否する", () => {
    const result = aiCategoryOutputSchema.safeParse({
      category: "食費",
      confidence: "very_high",
    })
    expect(result.success).toBe(false)
  })

  it("category フィールド欠損を拒否する", () => {
    const result = aiCategoryOutputSchema.safeParse({
      confidence: "low",
    })
    expect(result.success).toBe(false)
  })
})

describe("aiCategoryBatchOutputSchema", () => {
  it("複数件の有効なレスポンスを受け入れる", () => {
    const result = aiCategoryBatchOutputSchema.safeParse([
      { category: "食費", confidence: "high" },
      { category: "日用品", confidence: "medium", reasoning: "ドラッグストア" },
      { category: "その他", confidence: "low" },
    ])
    expect(result.success).toBe(true)
  })

  it("空配列を受け入れる", () => {
    const result = aiCategoryBatchOutputSchema.safeParse([])
    expect(result.success).toBe(true)
  })

  it("配列内の不正データを拒否する", () => {
    const result = aiCategoryBatchOutputSchema.safeParse([
      { category: "食費", confidence: "high" },
      { category: "", confidence: "invalid" },
    ])
    expect(result.success).toBe(false)
  })
})

describe("aiInsightsOutputSchema", () => {
  const validInsights = {
    suggestions: [
      {
        category: "食費",
        currentAverage: 50000,
        targetAmount: 40000,
        savingAmount: 10000,
        description: "まとめ買いで削減",
        priority: "high",
      },
    ],
    forecast: {
      totalPredicted: 150000,
      confidence: "high",
      confidenceReason: "6ヶ月分のデータあり",
      categories: [
        { category: "食費", predictedAmount: 50000, reason: "安定推移" },
      ],
    },
    summary: "全体的に支出は安定しています。食費の見直しで月1万円の削減が期待できます。",
  }

  it("有効なInsightsレスポンスを受け入れる", () => {
    const result = aiInsightsOutputSchema.safeParse(validInsights)
    expect(result.success).toBe(true)
  })

  it("suggestionsが空配列の場合は拒否する", () => {
    const result = aiInsightsOutputSchema.safeParse({
      ...validInsights,
      suggestions: [],
    })
    expect(result.success).toBe(false)
  })

  it("suggestionsが6件以上の場合は拒否する", () => {
    const sixSuggestions = Array.from({ length: 6 }, (_, i) => ({
      ...validInsights.suggestions[0],
      category: `カテゴリ${i}`,
    }))
    const result = aiInsightsOutputSchema.safeParse({
      ...validInsights,
      suggestions: sixSuggestions,
    })
    expect(result.success).toBe(false)
  })

  it("不正なpriority値を拒否する", () => {
    const result = aiInsightsOutputSchema.safeParse({
      ...validInsights,
      suggestions: [
        { ...validInsights.suggestions[0], priority: "critical" },
      ],
    })
    expect(result.success).toBe(false)
  })

  it("summaryが短すぎる場合は拒否する", () => {
    const result = aiInsightsOutputSchema.safeParse({
      ...validInsights,
      summary: "短い",
    })
    expect(result.success).toBe(false)
  })

  it("forecast.categoriesが空の場合は拒否する", () => {
    const result = aiInsightsOutputSchema.safeParse({
      ...validInsights,
      forecast: { ...validInsights.forecast, categories: [] },
    })
    expect(result.success).toBe(false)
  })

  it("負の金額を拒否する", () => {
    const result = aiInsightsOutputSchema.safeParse({
      ...validInsights,
      suggestions: [
        { ...validInsights.suggestions[0], savingAmount: -1000 },
      ],
    })
    expect(result.success).toBe(false)
  })
})
