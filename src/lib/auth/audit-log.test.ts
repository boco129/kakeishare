import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { logAuthEvent } from "@/lib/auth/audit-log"

describe("logAuthEvent", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("JSON構造化ログを出力する", () => {
    logAuthEvent("login_failure", {
      ip: "192.168.1.1",
      email: "test@example.com",
      reason: "invalid_password",
    })

    expect(console.log).toHaveBeenCalledOnce()
    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const parsed = JSON.parse(output)

    expect(parsed.event).toBe("login_failure")
    expect(parsed.reason).toBe("invalid_password")
    expect(parsed.ts).toBeDefined()
    // IP・emailはHMAC匿名化されているので元値と異なる
    expect(parsed.ip).not.toBe("192.168.1.1")
    expect(parsed.email).not.toBe("test@example.com")
    // 12文字のhex
    expect(parsed.ip).toHaveLength(12)
    expect(parsed.email).toHaveLength(12)
  })

  it("IP・emailが未指定ならundefined", () => {
    logAuthEvent("login_success", {})

    const output = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const parsed = JSON.parse(output)

    expect(parsed.ip).toBeUndefined()
    expect(parsed.email).toBeUndefined()
  })

  it("同じ入力値は同じハッシュを返す（決定性）", () => {
    logAuthEvent("login_failure", { ip: "10.0.0.1" })
    logAuthEvent("login_failure", { ip: "10.0.0.1" })

    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls
    const first = JSON.parse(calls[0][0]).ip
    const second = JSON.parse(calls[1][0]).ip

    expect(first).toBe(second)
  })

  it("異なる入力値は異なるハッシュを返す", () => {
    logAuthEvent("login_failure", { ip: "10.0.0.1" })
    logAuthEvent("login_failure", { ip: "10.0.0.2" })

    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls
    const first = JSON.parse(calls[0][0]).ip
    const second = JSON.parse(calls[1][0]).ip

    expect(first).not.toBe(second)
  })
})
