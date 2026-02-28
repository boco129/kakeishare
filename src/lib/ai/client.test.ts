import { describe, expect, it, beforeEach } from "vitest"
import { getAnthropicClient, getAnthropicClientSingleton, AI_MODELS } from "./client"
import type { Env } from "@/lib/env-schema"

const baseEnv: Env = {
  DATABASE_URL: "file:./prisma/dev.db",
  AUTH_SECRET: "test-secret-long-enough-for-32chars",
  ANTHROPIC_API_KEY: "sk-ant-test-key",
}

describe("AI_MODELS", () => {
  it("分類用モデルが定義されている", () => {
    expect(AI_MODELS.CLASSIFICATION).toBe("claude-haiku-4-5")
  })

  it("レポート/チャット用モデルが定義されている", () => {
    expect(AI_MODELS.REPORT).toBe("claude-sonnet-4-6")
  })
})

describe("getAnthropicClient", () => {
  it("API_KEY設定済みの場合はクライアントを返す", () => {
    const client = getAnthropicClient(baseEnv)
    expect(client).toBeDefined()
  })

  it("API_KEY未設定の場合はエラーを投げる", () => {
    const env: Env = { ...baseEnv, ANTHROPIC_API_KEY: undefined }
    expect(() => getAnthropicClient(env)).toThrow("AI_NOT_CONFIGURED")
  })

  it("呼び出しごとに新しいインスタンスを返す", () => {
    const client1 = getAnthropicClient(baseEnv)
    const client2 = getAnthropicClient(baseEnv)
    expect(client1).not.toBe(client2)
  })
})

describe("getAnthropicClientSingleton", () => {
  beforeEach(() => {
    globalThis.__anthropicByKey = undefined
  })

  it("同一キーで同一インスタンスを返す", () => {
    const client1 = getAnthropicClientSingleton(baseEnv)
    const client2 = getAnthropicClientSingleton(baseEnv)
    expect(client1).toBe(client2)
  })

  it("リセット後は新しいインスタンスを返す", () => {
    const client1 = getAnthropicClientSingleton(baseEnv)
    globalThis.__anthropicByKey = undefined
    const client2 = getAnthropicClientSingleton(baseEnv)
    expect(client1).not.toBe(client2)
  })

  it("異なるキーでは異なるインスタンスを返す", () => {
    const env2: Env = { ...baseEnv, ANTHROPIC_API_KEY: "sk-ant-other-key" }
    const client1 = getAnthropicClientSingleton(baseEnv)
    const client2 = getAnthropicClientSingleton(env2)
    expect(client1).not.toBe(client2)
  })
})
