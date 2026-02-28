import { describe, expect, it } from "vitest"
import { CHART_COLORS, colorByCategoryKey } from "./chart-colors"

describe("colorByCategoryKey", () => {
  it("同一キーで同一色を返す", () => {
    const color1 = colorByCategoryKey("cat_food")
    const color2 = colorByCategoryKey("cat_food")
    expect(color1).toBe(color2)
  })

  it("異なるキーで色を返す（CHART_COLORSの範囲内）", () => {
    const color = colorByCategoryKey("cat_transport")
    expect(CHART_COLORS).toContain(color)
  })

  it("nullカテゴリで安定した色を返す", () => {
    const color1 = colorByCategoryKey(null)
    const color2 = colorByCategoryKey(null)
    expect(color1).toBe(color2)
    expect(CHART_COLORS).toContain(color1)
  })

  it("undefinedカテゴリで安定した色を返す", () => {
    const color1 = colorByCategoryKey(undefined)
    const color2 = colorByCategoryKey(undefined)
    expect(color1).toBe(color2)
  })

  it("null と undefined で同じ色を返す（同じ正規化）", () => {
    expect(colorByCategoryKey(null)).toBe(colorByCategoryKey(undefined))
  })
})
