import { describe, expect, it, beforeEach, vi } from "vitest"
import {
  consumeReportRateLimit,
  resetReportRateLimitStore,
} from "./report-rate-limit"

describe("report-rate-limit", () => {
  beforeEach(() => {
    resetReportRateLimitStore()
  })

  it("初回は allowed: true, remaining: 4 を返す（消費済み）", () => {
    const result = consumeReportRateLimit("user1")
    expect(result).toEqual({ allowed: true, remaining: 4 })
  })

  it("5回目まで allowed: true", () => {
    for (let i = 0; i < 4; i++) {
      consumeReportRateLimit("user1")
    }
    const result = consumeReportRateLimit("user1")
    expect(result).toEqual({ allowed: true, remaining: 0 })
  })

  it("5回消費後は allowed: false", () => {
    for (let i = 0; i < 5; i++) {
      consumeReportRateLimit("user1")
    }
    const result = consumeReportRateLimit("user1")
    expect(result).toEqual({ allowed: false, remaining: 0 })
  })

  it("ユーザーごとに独立してカウントする", () => {
    for (let i = 0; i < 5; i++) {
      consumeReportRateLimit("user1")
    }
    const result = consumeReportRateLimit("user2")
    expect(result).toEqual({ allowed: true, remaining: 4 })
  })

  it("月が変わるとリセットされる", () => {
    for (let i = 0; i < 5; i++) {
      consumeReportRateLimit("user1")
    }
    expect(consumeReportRateLimit("user1").allowed).toBe(false)

    // 月を変更（1ヶ月先）
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    vi.useFakeTimers()
    vi.setSystemTime(nextMonth)

    const result = consumeReportRateLimit("user1")
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)

    vi.useRealTimers()
  })
})
