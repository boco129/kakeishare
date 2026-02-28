import { describe, it, expect, beforeEach } from "vitest"
import {
  InMemoryRateLimitStore,
  RATE_LIMIT_CONFIG,
} from "@/lib/auth/rate-limiter"

describe("InMemoryRateLimitStore", () => {
  let store: InMemoryRateLimitStore
  let currentTime: number

  beforeEach(() => {
    store = new InMemoryRateLimitStore()
    currentTime = 1000000
    store.now = () => currentTime
  })

  describe("checkAndConsume", () => {
    it("制限以下の試行は許可される", () => {
      const cfg = RATE_LIMIT_CONFIG.email // max: 5
      for (let i = 0; i < cfg.maxAttempts; i++) {
        const result = store.checkAndConsume(
          "email:test@example.com",
          cfg.windowMs,
          cfg.maxAttempts,
          cfg.blockMs,
        )
        expect(result.allowed).toBe(true)
        expect(result.retryAfterMs).toBe(0)
        currentTime += 1000 // 1秒ずつ進める
      }
    })

    it("制限超過でブロックされる", () => {
      const cfg = RATE_LIMIT_CONFIG.email // max: 5
      // maxAttempts回まで消費
      for (let i = 0; i < cfg.maxAttempts; i++) {
        store.checkAndConsume(
          "email:test@example.com",
          cfg.windowMs,
          cfg.maxAttempts,
          cfg.blockMs,
        )
        currentTime += 100
      }

      // maxAttempts + 1 回目でブロック
      const result = store.checkAndConsume(
        "email:test@example.com",
        cfg.windowMs,
        cfg.maxAttempts,
        cfg.blockMs,
      )
      expect(result.allowed).toBe(false)
      expect(result.retryAfterMs).toBeGreaterThan(0)
    })

    it("ブロック期間中は拒否され続ける", () => {
      const cfg = RATE_LIMIT_CONFIG.email

      // ブロック状態にする
      for (let i = 0; i <= cfg.maxAttempts; i++) {
        store.checkAndConsume(
          "email:test@example.com",
          cfg.windowMs,
          cfg.maxAttempts,
          cfg.blockMs,
        )
        currentTime += 100
      }

      // ブロック中の再試行
      const result = store.checkAndConsume(
        "email:test@example.com",
        cfg.windowMs,
        cfg.maxAttempts,
        cfg.blockMs,
      )
      expect(result.allowed).toBe(false)
    })

    it("ブロック期間経過後に再試行が許可される", () => {
      const cfg = RATE_LIMIT_CONFIG.email

      // ブロック状態にする
      for (let i = 0; i <= cfg.maxAttempts; i++) {
        store.checkAndConsume(
          "email:test@example.com",
          cfg.windowMs,
          cfg.maxAttempts,
          cfg.blockMs,
        )
        currentTime += 100
      }

      // ブロック期間を超えて時間を進める
      currentTime += cfg.blockMs + 1

      const result = store.checkAndConsume(
        "email:test@example.com",
        cfg.windowMs,
        cfg.maxAttempts,
        cfg.blockMs,
      )
      expect(result.allowed).toBe(true)
    })

    it("ウィンドウ外の古い試行は除去される", () => {
      const cfg = RATE_LIMIT_CONFIG.email

      // maxAttempts - 1 回消費
      for (let i = 0; i < cfg.maxAttempts - 1; i++) {
        store.checkAndConsume(
          "email:test@example.com",
          cfg.windowMs,
          cfg.maxAttempts,
          cfg.blockMs,
        )
        currentTime += 100
      }

      // ウィンドウを超えて時間を進める
      currentTime += cfg.windowMs + 1

      // 古い試行は除去されるので、再び maxAttempts 回まで可能
      for (let i = 0; i < cfg.maxAttempts; i++) {
        const result = store.checkAndConsume(
          "email:test@example.com",
          cfg.windowMs,
          cfg.maxAttempts,
          cfg.blockMs,
        )
        expect(result.allowed).toBe(true)
        currentTime += 100
      }
    })

    it("IPとemailは独立してカウントされる", () => {
      const ipCfg = RATE_LIMIT_CONFIG.ip // max: 20
      const emailCfg = RATE_LIMIT_CONFIG.email // max: 5

      // email制限を超過させる
      for (let i = 0; i <= emailCfg.maxAttempts; i++) {
        store.checkAndConsume(
          "email:test@example.com",
          emailCfg.windowMs,
          emailCfg.maxAttempts,
          emailCfg.blockMs,
        )
        currentTime += 100
      }

      // emailはブロック
      const emailResult = store.checkAndConsume(
        "email:test@example.com",
        emailCfg.windowMs,
        emailCfg.maxAttempts,
        emailCfg.blockMs,
      )
      expect(emailResult.allowed).toBe(false)

      // 同じ時点でIPは別キーなのでまだ許可
      const ipResult = store.checkAndConsume(
        "ip:192.168.1.1",
        ipCfg.windowMs,
        ipCfg.maxAttempts,
        ipCfg.blockMs,
      )
      expect(ipResult.allowed).toBe(true)
    })
  })

  describe("clear", () => {
    it("clearでカウンタがリセットされる", () => {
      const cfg = RATE_LIMIT_CONFIG.email

      // ブロック状態にする
      for (let i = 0; i <= cfg.maxAttempts; i++) {
        store.checkAndConsume(
          "email:test@example.com",
          cfg.windowMs,
          cfg.maxAttempts,
          cfg.blockMs,
        )
        currentTime += 100
      }

      // ブロック中
      expect(
        store.checkAndConsume(
          "email:test@example.com",
          cfg.windowMs,
          cfg.maxAttempts,
          cfg.blockMs,
        ).allowed,
      ).toBe(false)

      // クリア
      store.clear("email:test@example.com")

      // クリア後は再び許可
      const result = store.checkAndConsume(
        "email:test@example.com",
        cfg.windowMs,
        cfg.maxAttempts,
        cfg.blockMs,
      )
      expect(result.allowed).toBe(true)
    })
  })

  describe("email+ip 複合スコープ", () => {
    it("email+ipの閾値で独立して制限される", () => {
      const cfg = RATE_LIMIT_CONFIG.emailIp // max: 7

      for (let i = 0; i < cfg.maxAttempts; i++) {
        const result = store.checkAndConsume(
          "email_ip:test@example.com:192.168.1.1",
          cfg.windowMs,
          cfg.maxAttempts,
          cfg.blockMs,
        )
        expect(result.allowed).toBe(true)
        currentTime += 100
      }

      // 超過
      const result = store.checkAndConsume(
        "email_ip:test@example.com:192.168.1.1",
        cfg.windowMs,
        cfg.maxAttempts,
        cfg.blockMs,
      )
      expect(result.allowed).toBe(false)
    })
  })

  describe("peek", () => {
    it("ブロック中はallowed=falseを返す（消費しない）", () => {
      const cfg = RATE_LIMIT_CONFIG.email

      // ブロック状態にする
      for (let i = 0; i <= cfg.maxAttempts; i++) {
        store.checkAndConsume(
          "email:test@example.com",
          cfg.windowMs,
          cfg.maxAttempts,
          cfg.blockMs,
        )
        currentTime += 100
      }

      const result = store.peek("email:test@example.com")
      expect(result.allowed).toBe(false)
      expect(result.retryAfterMs).toBeGreaterThan(0)
    })

    it("ブロックされていなければallowed=trueを返す", () => {
      const result = store.peek("email:nonexistent@example.com")
      expect(result.allowed).toBe(true)
      expect(result.retryAfterMs).toBe(0)
    })

    it("peekはカウンタを消費しない", () => {
      const cfg = RATE_LIMIT_CONFIG.email

      // peek を何回呼んでもカウンタは増えない
      for (let i = 0; i < 100; i++) {
        store.peek("email:test@example.com")
      }

      // checkAndConsumeはまだmaxAttempts回可能
      for (let i = 0; i < cfg.maxAttempts; i++) {
        const result = store.checkAndConsume(
          "email:test@example.com",
          cfg.windowMs,
          cfg.maxAttempts,
          cfg.blockMs,
        )
        expect(result.allowed).toBe(true)
        currentTime += 100
      }
    })
  })

  describe("境界値テスト", () => {
    it("ちょうどmaxAttempts回は許可、maxAttempts+1回で拒否", () => {
      const key = "test:boundary"
      const windowMs = 60000
      const maxAttempts = 3
      const blockMs = 60000

      // ちょうどmaxAttempts回は許可
      for (let i = 0; i < maxAttempts; i++) {
        const result = store.checkAndConsume(key, windowMs, maxAttempts, blockMs)
        expect(result.allowed).toBe(true)
        currentTime += 100
      }

      // maxAttempts + 1 回目で拒否
      const result = store.checkAndConsume(key, windowMs, maxAttempts, blockMs)
      expect(result.allowed).toBe(false)
      expect(result.retryAfterMs).toBe(blockMs)
    })

    it("ウィンドウ境界ちょうどのタイムスタンプは除去される", () => {
      const key = "test:window-boundary"
      const windowMs = 10000
      const maxAttempts = 2
      const blockMs = 5000

      // 1回消費
      store.checkAndConsume(key, windowMs, maxAttempts, blockMs)
      const firstTime = currentTime

      // ちょうどウィンドウ分進める（windowMs後にフィルタ: t > windowStart）
      currentTime = firstTime + windowMs + 1

      // ウィンドウ外なので1回目の記録は消える → 再び2回まで可能
      const result = store.checkAndConsume(key, windowMs, maxAttempts, blockMs)
      expect(result.allowed).toBe(true)
    })
  })
})
