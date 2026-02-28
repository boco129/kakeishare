import { describe, expect, it } from "vitest"
import {
  getAnthropicApiKeyOrThrow,
  isAIAvailable,
  AI_NOT_CONFIGURED,
} from "./config"
import type { Env } from "@/lib/env-schema"

const baseEnv: Env = {
  DATABASE_URL: "file:./prisma/dev.db",
  AUTH_SECRET: "test-secret-long-enough-for-32chars",
}

describe("getAnthropicApiKeyOrThrow", () => {
  it("ANTHROPIC_API_KEY 設定済みの場合はキーを返す", () => {
    const env = { ...baseEnv, ANTHROPIC_API_KEY: "sk-ant-test" }
    expect(getAnthropicApiKeyOrThrow(env)).toBe("sk-ant-test")
  })

  it("ANTHROPIC_API_KEY 未設定の場合は AI_NOT_CONFIGURED エラーを投げる", () => {
    expect(() => getAnthropicApiKeyOrThrow(baseEnv)).toThrow(AI_NOT_CONFIGURED)
  })

  it("ANTHROPIC_API_KEY が undefined の場合もエラーを投げる", () => {
    const env = { ...baseEnv, ANTHROPIC_API_KEY: undefined }
    expect(() => getAnthropicApiKeyOrThrow(env)).toThrow(AI_NOT_CONFIGURED)
  })
})

describe("isAIAvailable", () => {
  it("ANTHROPIC_API_KEY 設定済みの場合は true", () => {
    const env = { ...baseEnv, ANTHROPIC_API_KEY: "sk-ant-test" }
    expect(isAIAvailable(env)).toBe(true)
  })

  it("ANTHROPIC_API_KEY 未設定の場合は false", () => {
    expect(isAIAvailable(baseEnv)).toBe(false)
  })
})
