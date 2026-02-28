import { describe, expect, it, vi, beforeEach } from "vitest"
import { Visibility } from "@/generated/prisma/enums"

// db モジュールをモック
vi.mock("@/lib/db", () => ({
  db: {
    category: {
      findUnique: vi.fn(),
    },
  },
}))

import { resolveVisibility } from "./visibility"
import { db } from "@/lib/db"

const mockFindUnique = vi.mocked(db.category.findUnique)

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
