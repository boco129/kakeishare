import { describe, expect, it, vi } from "vitest"
import {
  normalizeCategoryName,
  resolveCategoryId,
  type CategoryForResolver,
} from "./category-resolver"
import { Visibility } from "@/generated/prisma/enums"

// テスト用カテゴリ一覧（シードデータと同じ構成）
const CATEGORIES: CategoryForResolver[] = [
  { id: "cat_food", name: "食費", defaultVisibility: Visibility.PUBLIC },
  { id: "cat_daily", name: "日用品", defaultVisibility: Visibility.PUBLIC },
  { id: "cat_housing", name: "住居", defaultVisibility: Visibility.PUBLIC },
  { id: "cat_utility", name: "光熱費", defaultVisibility: Visibility.PUBLIC },
  { id: "cat_telecom", name: "通信費", defaultVisibility: Visibility.PUBLIC },
  { id: "cat_transport", name: "交通費", defaultVisibility: Visibility.PUBLIC },
  { id: "cat_social", name: "交際費", defaultVisibility: Visibility.AMOUNT_ONLY },
  { id: "cat_clothing", name: "衣服・美容", defaultVisibility: Visibility.AMOUNT_ONLY },
  { id: "cat_medical", name: "医療", defaultVisibility: Visibility.AMOUNT_ONLY },
  { id: "cat_education", name: "教育", defaultVisibility: Visibility.PUBLIC },
  { id: "cat_hobby", name: "個人娯楽", defaultVisibility: Visibility.CATEGORY_TOTAL },
  { id: "cat_subscription", name: "サブスク", defaultVisibility: Visibility.PUBLIC },
  { id: "cat_insurance", name: "保険", defaultVisibility: Visibility.PUBLIC },
  { id: "cat_car", name: "自動車", defaultVisibility: Visibility.PUBLIC },
  { id: "cat_other", name: "その他", defaultVisibility: Visibility.AMOUNT_ONLY },
]

describe("normalizeCategoryName", () => {
  it("前後の空白を除去する", () => {
    expect(normalizeCategoryName("  食費  ")).toBe("食費")
  })

  it("全角スペースを除去する", () => {
    expect(normalizeCategoryName("食　費")).toBe("食費")
  })

  it("半角スペースを除去する", () => {
    expect(normalizeCategoryName("食 費")).toBe("食費")
  })

  it("NFKC正規化を適用する", () => {
    // 全角英数→半角
    expect(normalizeCategoryName("ＡＢＣ")).toBe("ABC")
  })

  it("区切り文字の揺れを統一する", () => {
    expect(normalizeCategoryName("衣服・美容")).toBe("衣服/美容")
    expect(normalizeCategoryName("衣服･美容")).toBe("衣服/美容")
    expect(normalizeCategoryName("衣服／美容")).toBe("衣服/美容")
  })
})

describe("resolveCategoryId", () => {
  it("完全一致するカテゴリを解決する", () => {
    const result = resolveCategoryId("食費", CATEGORIES)
    expect(result.categoryId).toBe("cat_food")
    expect(result.visibility).toBe(Visibility.PUBLIC)
    expect(result.resolvedName).toBe("食費")
  })

  it("区切り文字の揺れがあっても解決する", () => {
    const result = resolveCategoryId("衣服･美容", CATEGORIES)
    expect(result.categoryId).toBe("cat_clothing")
  })

  it("前後スペースがあっても解決する", () => {
    const result = resolveCategoryId(" 交通費 ", CATEGORIES)
    expect(result.categoryId).toBe("cat_transport")
  })

  it("同義語「外食」→「食費」に解決する", () => {
    const result = resolveCategoryId("外食", CATEGORIES)
    expect(result.categoryId).toBe("cat_food")
    expect(result.resolvedName).toBe("食費")
  })

  it("同義語「カフェ」→「食費」に解決する", () => {
    const result = resolveCategoryId("カフェ", CATEGORIES)
    expect(result.categoryId).toBe("cat_food")
  })

  it("同義語「飲み会」→「交際費」に解決する", () => {
    const result = resolveCategoryId("飲み会", CATEGORIES)
    expect(result.categoryId).toBe("cat_social")
  })

  it("同義語「サブスクリプション」→「サブスク」に解決する", () => {
    const result = resolveCategoryId("サブスクリプション", CATEGORIES)
    expect(result.categoryId).toBe("cat_subscription")
  })

  it("同義語「病院」→「医療」に解決する", () => {
    const result = resolveCategoryId("病院", CATEGORIES)
    expect(result.categoryId).toBe("cat_medical")
  })

  it("未知のカテゴリは「その他」にフォールバックする", () => {
    const result = resolveCategoryId("宇宙旅行", CATEGORIES)
    expect(result.categoryId).toBe("cat_other")
    expect(result.resolvedName).toBe("その他")
    expect(result.visibility).toBe(Visibility.AMOUNT_ONLY)
  })

  it("カテゴリ一覧が空の場合は null を返す", () => {
    const result = resolveCategoryId("食費", [])
    expect(result.categoryId).toBeNull()
    expect(result.visibility).toBeNull()
  })

  it("「その他」も無い場合は null を返す", () => {
    const partial = CATEGORIES.filter((c) => c.name !== "その他")
    const result = resolveCategoryId("宇宙旅行", partial)
    expect(result.categoryId).toBeNull()
  })

  it("defaultVisibility を正しく返す", () => {
    const result = resolveCategoryId("個人娯楽", CATEGORIES)
    expect(result.visibility).toBe(Visibility.CATEGORY_TOTAL)
  })

  it("正規化後にカテゴリ名が衝突する場合は警告を出し最初を優先する", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const dupes: CategoryForResolver[] = [
      { id: "cat_a", name: "衣服・美容", defaultVisibility: Visibility.PUBLIC },
      { id: "cat_b", name: "衣服/美容", defaultVisibility: Visibility.AMOUNT_ONLY },
    ]
    const result = resolveCategoryId("衣服・美容", dupes)
    expect(result.categoryId).toBe("cat_a")
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("衝突")
    )
    spy.mockRestore()
  })
})
