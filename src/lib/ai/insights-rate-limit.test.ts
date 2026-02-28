import { describe, expect, it, beforeEach, vi } from "vitest"
import {
  consumeInsightsRateLimit,
  resetInsightsRateLimitStore,
} from "./insights-rate-limit"

describe("insights-rate-limit", () => {
  beforeEach(() => {
    resetInsightsRateLimitStore()
  })

  it("初回は allowed: true, remaining: 4 を返す（消費済み）", () => {
    const result = consumeInsightsRateLimit("user1")
    expect(result).toEqual({ allowed: true, remaining: 4 })
  })

  it("5回目まで allowed: true", () => {
    for (let i = 0; i < 4; i++) {
      consumeInsightsRateLimit("user1")
    }
    const result = consumeInsightsRateLimit("user1")
    expect(result).toEqual({ allowed: true, remaining: 0 })
  })

  it("5回消費後は allowed: false", () => {
    for (let i = 0; i < 5; i++) {
      consumeInsightsRateLimit("user1")
    }
    const result = consumeInsightsRateLimit("user1")
    expect(result).toEqual({ allowed: false, remaining: 0 })
  })

  it("ユーザーごとに独立してカウントする", () => {
    for (let i = 0; i < 5; i++) {
      consumeInsightsRateLimit("user1")
    }
    const result = consumeInsightsRateLimit("user2")
    expect(result).toEqual({ allowed: true, remaining: 4 })
  })

  it("月が変わるとリセットされる", () => {
    for (let i = 0; i < 5; i++) {
      consumeInsightsRateLimit("user1")
    }
    expect(consumeInsightsRateLimit("user1").allowed).toBe(false)

    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    vi.useFakeTimers()
    vi.setSystemTime(nextMonth)

    const result = consumeInsightsRateLimit("user1")
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)

    vi.useRealTimers()
  })
})
