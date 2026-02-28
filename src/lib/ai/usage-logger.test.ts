import { describe, expect, it, vi } from "vitest"
import { logTokenUsage } from "./usage-logger"

describe("logTokenUsage", () => {
  it("usage情報をログ出力する", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {})

    const result = logTokenUsage("classify", {
      input_tokens: 100,
      output_tokens: 50,
    })

    expect(spy).toHaveBeenCalledWith(
      "[ai.usage]",
      expect.objectContaining({
        action: "classify",
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      })
    )
    expect(result).not.toBeNull()
    expect(result!.timestamp).toBeDefined()

    spy.mockRestore()
  })

  it("キャッシュトークンも集計する", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {})

    const result = logTokenUsage("report", {
      input_tokens: 200,
      output_tokens: 100,
      cache_creation_input_tokens: 50,
      cache_read_input_tokens: 30,
    })

    expect(result!.totalTokens).toBe(380)
    expect(result!.cacheCreationInputTokens).toBe(50)
    expect(result!.cacheReadInputTokens).toBe(30)

    spy.mockRestore()
  })

  it("usageがundefinedの場合はnullを返す", () => {
    const result = logTokenUsage("classify", undefined)
    expect(result).toBeNull()
  })

  it("トークン数が未定義の場合は0として扱う", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {})

    const result = logTokenUsage("classify", {})

    expect(result!.inputTokens).toBe(0)
    expect(result!.outputTokens).toBe(0)
    expect(result!.totalTokens).toBe(0)

    spy.mockRestore()
  })
})
