import { describe, expect, it } from "vitest"
import { safeRedirectPath } from "@/lib/auth/safe-redirect-path"

describe("safeRedirectPath", () => {
  it("正常な相対パス /expenses → そのまま返却", () => {
    expect(safeRedirectPath("/expenses")).toBe("/expenses")
  })

  it("プロトコル相対URL //evil.com → / にフォールバック", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/")
  })

  it("外部URL（フラグメント付き）→ / にフォールバック", () => {
    expect(safeRedirectPath("https://evil.com/x#pwn")).toBe("/")
  })

  it("空文字列 → /", () => {
    expect(safeRedirectPath("")).toBe("/")
  })

  it("クエリパラメータ付き /expenses?page=2 → 保持", () => {
    expect(safeRedirectPath("/expenses?page=2")).toBe("/expenses?page=2")
  })

  it("クエリ・ハッシュ付き相対パスを保持", () => {
    expect(safeRedirectPath("/expenses?month=2026-02#summary")).toBe(
      "/expenses?month=2026-02#summary"
    )
  })

  it("ルートパス / → そのまま返却", () => {
    expect(safeRedirectPath("/")).toBe("/")
  })
})
