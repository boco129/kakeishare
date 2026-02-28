import { describe, expect, it } from "vitest"
import { formatJPY, formatPercent } from "./chart-format"

describe("formatJPY", () => {
  it("正数をフォーマット", () => {
    expect(formatJPY(12345)).toBe("￥12,345")
  })

  it("0をフォーマット", () => {
    expect(formatJPY(0)).toBe("￥0")
  })

  it("大きい数値をフォーマット", () => {
    expect(formatJPY(1000000)).toBe("￥1,000,000")
  })

  it("負数をフォーマット", () => {
    expect(formatJPY(-500)).toBe("-￥500")
  })
})

describe("formatPercent", () => {
  it("整数パーセント", () => {
    expect(formatPercent(65)).toBe("65%")
  })

  it("小数を四捨五入", () => {
    expect(formatPercent(33.7)).toBe("34%")
  })

  it("0パーセント", () => {
    expect(formatPercent(0)).toBe("0%")
  })

  it("100パーセント", () => {
    expect(formatPercent(100)).toBe("100%")
  })
})
