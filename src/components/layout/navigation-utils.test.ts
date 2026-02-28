import { describe, expect, it } from "vitest"
import { isPathActive } from "@/components/layout/navigation-utils"

describe("isPathActive", () => {
  it("/ はホームページのみでアクティブになる", () => {
    expect(isPathActive("/", "/")).toBe(true)
    expect(isPathActive("/expenses", "/")).toBe(false)
    expect(isPathActive("/settings", "/")).toBe(false)
  })

  it("完全一致でアクティブになる", () => {
    expect(isPathActive("/expenses", "/expenses")).toBe(true)
    expect(isPathActive("/review", "/review")).toBe(true)
    expect(isPathActive("/chat", "/chat")).toBe(true)
    expect(isPathActive("/settings", "/settings")).toBe(true)
  })

  it("子パス一致でアクティブになる", () => {
    expect(isPathActive("/expenses/123", "/expenses")).toBe(true)
    expect(isPathActive("/expenses/new", "/expenses")).toBe(true)
    expect(isPathActive("/review/detail", "/review")).toBe(true)
  })

  it("部分一致の誤検知を防ぐ", () => {
    expect(isPathActive("/reviewer", "/review")).toBe(false)
    expect(isPathActive("/expenses-summary", "/expenses")).toBe(false)
    expect(isPathActive("/settings-advanced", "/settings")).toBe(false)
  })

  it("非一致は false", () => {
    expect(isPathActive("/settings", "/review")).toBe(false)
    expect(isPathActive("/expenses", "/settings")).toBe(false)
    expect(isPathActive("/review", "/expenses")).toBe(false)
  })

  it("pathname末尾スラッシュは一致する", () => {
    expect(isPathActive("/expenses/", "/expenses")).toBe(true)
    expect(isPathActive("/review/", "/review")).toBe(true)
  })

  it("href末尾スラッシュも正規化されて一致する", () => {
    expect(isPathActive("/expenses", "/expenses/")).toBe(true)
    expect(isPathActive("/expenses/", "/expenses/")).toBe(true)
    expect(isPathActive("/review", "/review/")).toBe(true)
  })

  it("空文字pathnameは false", () => {
    expect(isPathActive("", "/expenses")).toBe(false)
    expect(isPathActive("", "/")).toBe(false)
  })
})
