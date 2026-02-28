import { describe, expect, it } from "vitest"
import { aiCategoryOutputSchema, aiCategoryBatchOutputSchema } from "./schemas"

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
