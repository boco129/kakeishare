import { describe, expect, it } from "vitest"
import {
  PROMPT_VERSIONS,
  MAX_CLASSIFICATION_BATCH_SIZE,
  buildCategorySystemPrompt,
  buildCategoryUserMessage,
  buildReportSystemPrompt,
  buildReportUserMessage,
  buildChatSystemPrompt,
  buildChatUserMessage,
} from "./prompts"
import type { AICategoryInput, AIReportInput } from "./types"

describe("PROMPT_VERSIONS", () => {
  it("全プロンプトのバージョンが定義されている", () => {
    expect(PROMPT_VERSIONS.CLASSIFICATION).toBeDefined()
    expect(PROMPT_VERSIONS.REPORT).toBeDefined()
    expect(PROMPT_VERSIONS.CHAT).toBeDefined()
  })
})

describe("buildCategorySystemPrompt", () => {
  it("JSON配列を要求する文言を含む", () => {
    const prompt = buildCategorySystemPrompt()
    expect(prompt).toContain("JSON配列")
  })

  it("全カテゴリ名を含む", () => {
    const prompt = buildCategorySystemPrompt()
    const expected = ["食費", "日用品", "交通費", "交際費", "その他"]
    for (const name of expected) {
      expect(prompt).toContain(name)
    }
  })

  it("confidence の選択肢を含む", () => {
    const prompt = buildCategorySystemPrompt()
    expect(prompt).toContain('"high"')
    expect(prompt).toContain('"medium"')
    expect(prompt).toContain('"low"')
  })

  it("カスタムカテゴリ名を渡すとそれがプロンプトに反映される", () => {
    const prompt = buildCategorySystemPrompt(["カスタムA", "カスタムB"])
    expect(prompt).toContain("カスタムA")
    expect(prompt).toContain("カスタムB")
    expect(prompt).not.toContain("食費")
  })

  it("空配列を渡すとデフォルトカテゴリが使われる", () => {
    const prompt = buildCategorySystemPrompt([])
    expect(prompt).toContain("食費")
  })
})

describe("buildCategoryUserMessage", () => {
  it("入力をJSON文字列に変換する", () => {
    const inputs: AICategoryInput[] = [
      { description: "スターバックス", amount: 550, date: "2026-01-15" },
    ]
    const message = buildCategoryUserMessage(inputs)
    const parsed = JSON.parse(message)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].description).toBe("スターバックス")
  })

  it("バッチサイズ上限を超えるとエラーを投げる", () => {
    const inputs: AICategoryInput[] = Array.from(
      { length: MAX_CLASSIFICATION_BATCH_SIZE + 1 },
      (_, i) => ({ description: `店舗${i}`, amount: 100, date: "2026-01-01" })
    )
    expect(() => buildCategoryUserMessage(inputs)).toThrow("上限")
  })

  it("バッチサイズ上限ちょうどは受け入れる", () => {
    const inputs: AICategoryInput[] = Array.from(
      { length: MAX_CLASSIFICATION_BATCH_SIZE },
      (_, i) => ({ description: `店舗${i}`, amount: 100, date: "2026-01-01" })
    )
    expect(() => buildCategoryUserMessage(inputs)).not.toThrow()
  })
})

describe("buildReportSystemPrompt", () => {
  it("家計アドバイザーとしての役割を含む", () => {
    const prompt = buildReportSystemPrompt()
    expect(prompt).toContain("家計")
  })

  it("非公開カテゴリへの配慮を含む", () => {
    const prompt = buildReportSystemPrompt()
    expect(prompt).toContain("非公開")
  })
})

describe("buildReportUserMessage", () => {
  it("年月とサマリーデータを含む", () => {
    const input: AIReportInput = {
      yearMonth: "2026-01",
      summary: {
        totalAmount: 300000,
        categoryBreakdown: [{ category: "食費", amount: 80000, count: 30 }],
        coupleRatio: { user1: 60, user2: 40 },
        budgetSummary: [{ category: "食費", budget: 80000, actual: 80000 }],
      },
    }
    const message = buildReportUserMessage(input)
    expect(message).toContain("2026-01")
    expect(message).toContain("300000")
  })
})

describe("buildChatSystemPrompt", () => {
  it("責めない表現への配慮を含む", () => {
    const prompt = buildChatSystemPrompt()
    expect(prompt).toContain("責める")
  })
})

describe("buildChatUserMessage", () => {
  it("コンテキスト付きでメッセージを構築する", () => {
    const message = buildChatUserMessage("節約方法は？", "月の食費: 8万円")
    expect(message).toContain("節約方法は？")
    expect(message).toContain("月の食費: 8万円")
  })

  it("コンテキストなしでもメッセージを返す", () => {
    const message = buildChatUserMessage("節約方法は？")
    expect(message).toBe("節約方法は？")
  })
})
