import { describe, expect, it, vi, beforeEach } from "vitest"
import { Visibility } from "@/generated/prisma/enums"

// db モジュールをモック
vi.mock("@/lib/db", () => ({
  db: {
    category: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { resolveVisibility, resolveVisibilityBatch } from "./visibility"
import { db } from "@/lib/db"

const mockFindUnique = vi.mocked(db.category.findUnique)
const mockFindMany = vi.mocked(db.category.findMany)

const USER_ID = "user-1"
const CATEGORY_ID = "cat-food"

beforeEach(() => {
  vi.resetAllMocks()
})

describe("resolveVisibility", () => {
  describe("明示指定がある場合", () => {
    it.each([
      Visibility.AMOUNT_ONLY,
      Visibility.CATEGORY_TOTAL,
      Visibility.PUBLIC,
    ])("%s を明示指定 → そのまま返す", async (explicit) => {
      const result = await resolveVisibility(USER_ID, CATEGORY_ID, explicit)

      expect(result).toBe(explicit)
      expect(mockFindUnique).not.toHaveBeenCalled()
    })

    it("categoryId 未指定でも explicit を優先し、DBを呼ばない", async () => {
      const result = await resolveVisibility(USER_ID, undefined, Visibility.AMOUNT_ONLY)

      expect(result).toBe(Visibility.AMOUNT_ONLY)
      expect(mockFindUnique).not.toHaveBeenCalled()
    })
  })

  describe("CategoryVisibilitySetting が存在する場合", () => {
    it("ユーザー別設定を優先して返す", async () => {
      mockFindUnique.mockResolvedValue({
        defaultVisibility: Visibility.PUBLIC,
        visibilitySettings: [{ visibility: Visibility.CATEGORY_TOTAL }],
      } as never)

      const result = await resolveVisibility(USER_ID, CATEGORY_ID)

      expect(result).toBe(Visibility.CATEGORY_TOTAL)
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: CATEGORY_ID },
        include: {
          visibilitySettings: {
            where: { userId: USER_ID },
            select: { visibility: true },
          },
        },
      })
    })
  })

  describe("CategoryVisibilitySetting なし + Category.defaultVisibility あり", () => {
    it("カテゴリのデフォルト visibility を返す", async () => {
      mockFindUnique.mockResolvedValue({
        defaultVisibility: Visibility.AMOUNT_ONLY,
        visibilitySettings: [],
      } as never)

      const result = await resolveVisibility(USER_ID, CATEGORY_ID)

      expect(result).toBe(Visibility.AMOUNT_ONLY)
    })
  })

  describe("categoryId が null / undefined", () => {
    it("categoryId が null → PUBLIC フォールバック", async () => {
      const result = await resolveVisibility(USER_ID, null)

      expect(result).toBe(Visibility.PUBLIC)
      expect(mockFindUnique).not.toHaveBeenCalled()
    })

    it("categoryId が undefined → PUBLIC フォールバック", async () => {
      const result = await resolveVisibility(USER_ID, undefined)

      expect(result).toBe(Visibility.PUBLIC)
      expect(mockFindUnique).not.toHaveBeenCalled()
    })

    it("categoryId を省略 → PUBLIC フォールバック", async () => {
      const result = await resolveVisibility(USER_ID)

      expect(result).toBe(Visibility.PUBLIC)
      expect(mockFindUnique).not.toHaveBeenCalled()
    })

    it('categoryId が空文字 "" → PUBLIC フォールバック', async () => {
      const result = await resolveVisibility(USER_ID, "")

      expect(result).toBe(Visibility.PUBLIC)
      expect(mockFindUnique).not.toHaveBeenCalled()
    })
  })

  describe("存在しない categoryId", () => {
    it("findUnique が null を返す → PUBLIC フォールバック", async () => {
      mockFindUnique.mockResolvedValue(null)

      const result = await resolveVisibility(USER_ID, "non-existent-cat")

      expect(result).toBe(Visibility.PUBLIC)
    })
  })
})

describe("resolveVisibilityBatch", () => {
  it("複数カテゴリのvisibilityを一括で解決する", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "cat1",
        defaultVisibility: Visibility.PUBLIC,
        visibilitySettings: [],
      },
      {
        id: "cat2",
        defaultVisibility: Visibility.AMOUNT_ONLY,
        visibilitySettings: [{ visibility: Visibility.CATEGORY_TOTAL }],
      },
    ] as never)

    const result = await resolveVisibilityBatch(USER_ID, ["cat1", "cat2"])

    expect(result.get("cat1")).toBe(Visibility.PUBLIC)
    // ユーザー別設定が優先される
    expect(result.get("cat2")).toBe(Visibility.CATEGORY_TOTAL)
  })

  it("null を含むcategoryIds配列を正しくフィルタリングする", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "cat1",
        defaultVisibility: Visibility.PUBLIC,
        visibilitySettings: [],
      },
    ] as never)

    const result = await resolveVisibilityBatch(USER_ID, [null, "cat1", null])

    expect(result.size).toBe(1)
    expect(result.get("cat1")).toBe(Visibility.PUBLIC)
  })

  it("空の配列では空のMapを返す", async () => {
    const result = await resolveVisibilityBatch(USER_ID, [])
    expect(result.size).toBe(0)
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it("全てnullの場合も空のMapを返す", async () => {
    const result = await resolveVisibilityBatch(USER_ID, [null, null])
    expect(result.size).toBe(0)
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it("重複するcategoryIdsは一意化される", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "cat1",
        defaultVisibility: Visibility.PUBLIC,
        visibilitySettings: [],
      },
    ] as never)

    await resolveVisibilityBatch(USER_ID, ["cat1", "cat1", "cat1"])

    // findMany の where.id.in に重複なく渡される
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["cat1"] } },
      include: {
        visibilitySettings: {
          where: { userId: USER_ID },
          select: { visibility: true },
        },
      },
    })
  })
})
