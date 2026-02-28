import { describe, expect, it, beforeEach, vi } from "vitest"
import {
  consumeChatRateLimit,
  resetChatRateLimitStore,
} from "./chat-rate-limit"

describe("chat-rate-limit", () => {
  beforeEach(() => {
    resetChatRateLimitStore()
  })

  it("初回は allowed: true, remaining: 19 を返す（消費済み）", () => {
    const result = consumeChatRateLimit("user1")
    expect(result).toEqual({ allowed: true, remaining: 19 })
  })

  it("20回目まで allowed: true", () => {
    for (let i = 0; i < 19; i++) {
      consumeChatRateLimit("user1")
    }
    const result = consumeChatRateLimit("user1")
    expect(result).toEqual({ allowed: true, remaining: 0 })
  })

  it("20回消費後は allowed: false", () => {
    for (let i = 0; i < 20; i++) {
      consumeChatRateLimit("user1")
    }
    const result = consumeChatRateLimit("user1")
    expect(result).toEqual({ allowed: false, remaining: 0 })
  })

  it("ユーザーごとに独立してカウントする", () => {
    for (let i = 0; i < 20; i++) {
      consumeChatRateLimit("user1")
    }
    const result = consumeChatRateLimit("user2")
    expect(result).toEqual({ allowed: true, remaining: 19 })
  })

  it("日が変わるとリセットされる", () => {
    for (let i = 0; i < 20; i++) {
      consumeChatRateLimit("user1")
    }
    expect(consumeChatRateLimit("user1").allowed).toBe(false)

    // 日を変更（1日先）
    const nextDay = new Date()
    nextDay.setDate(nextDay.getDate() + 1)
    vi.useFakeTimers()
    vi.setSystemTime(nextDay)

    const result = consumeChatRateLimit("user1")
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(19)

    vi.useRealTimers()
  })
})
