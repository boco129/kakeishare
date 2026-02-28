// 予算API E2E テスト — 認可制御 / CRUD / upsert / バリデーション
import { test, expect, type APIResponse, type Playwright, type TestInfo } from "@playwright/test"

// api プロジェクトのみで実行
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "api")
})

/** playwright.config.ts の use.baseURL を取得 */
function getBaseURL(testInfo: TestInfo) {
  return testInfo.project.use.baseURL ?? "http://localhost:3000"
}

// ----------------------------------------------------------------
// ヘルパー関数
// ----------------------------------------------------------------

/** APIエラーレスポンスのステータスコードとエラーコードを検証 */
async function expectApiError(res: APIResponse, status: number, code: string) {
  expect(res.status()).toBe(status)
  const body = await res.json()
  expect(body.ok).toBe(false)
  expect(body.error.code).toBe(code)
}

/** member（花子）用 APIRequestContext でコールバックを実行し、自動で dispose */
async function withMemberRequest(
  playwright: Playwright,
  baseURL: string,
  fn: (ctx: import("@playwright/test").APIRequestContext) => Promise<void>,
) {
  const ctx = await playwright.request.newContext({
    baseURL,
    storageState: "e2e/.auth/member.json",
  })
  try {
    await fn(ctx)
  } finally {
    await ctx.dispose()
  }
}

// ----------------------------------------------------------------
// 認可制御
// ----------------------------------------------------------------
test.describe("認可制御", () => {
  test("未認証リクエスト → 401", async ({ playwright }, testInfo) => {
    const unauthed = await playwright.request.newContext({
      baseURL: getBaseURL(testInfo),
    })

    try {
      await expectApiError(
        await unauthed.get("/api/budgets?yearMonth=2026-01"),
        401, "UNAUTHORIZED",
      )
      await expectApiError(
        await unauthed.post("/api/budgets", {
          data: { yearMonth: "2026-01", amount: 100000 },
        }),
        401, "UNAUTHORIZED",
      )
      await expectApiError(
        await unauthed.patch("/api/budgets/dummy-id", { data: { amount: 50000 } }),
        401, "UNAUTHORIZED",
      )
      await expectApiError(
        await unauthed.delete("/api/budgets/dummy-id"),
        401, "UNAUTHORIZED",
      )
    } finally {
      await unauthed.dispose()
    }
  })

  test("MEMBER（花子）の予算一覧取得 → 200（閲覧は全ユーザー可）", async ({ playwright }, testInfo) => {
    await withMemberRequest(playwright, getBaseURL(testInfo), async (hanakoReq) => {
      const res = await hanakoReq.get("/api/budgets?yearMonth=2026-01")
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(Array.isArray(body.data)).toBe(true)
    })
  })

  test("MEMBER（花子）の予算作成 → 403", async ({ playwright }, testInfo) => {
    await withMemberRequest(playwright, getBaseURL(testInfo), async (hanakoReq) => {
      await expectApiError(
        await hanakoReq.post("/api/budgets", {
          data: { yearMonth: "2099-01", amount: 100000 },
        }),
        403, "FORBIDDEN",
      )
    })
  })

  test("MEMBER（花子）の予算更新 → 403", async ({ playwright }, testInfo) => {
    await withMemberRequest(playwright, getBaseURL(testInfo), async (hanakoReq) => {
      await expectApiError(
        await hanakoReq.patch("/api/budgets/dummy-id", { data: { amount: 50000 } }),
        403, "FORBIDDEN",
      )
    })
  })

  test("MEMBER（花子）の予算削除 → 403", async ({ playwright }, testInfo) => {
    await withMemberRequest(playwright, getBaseURL(testInfo), async (hanakoReq) => {
      await expectApiError(
        await hanakoReq.delete("/api/budgets/dummy-id"),
        403, "FORBIDDEN",
      )
    })
  })
})

// ----------------------------------------------------------------
// CRUD ライフサイクル
// ----------------------------------------------------------------
test.describe("CRUD操作", () => {
  test("カテゴリ予算の作成 → 取得 → 更新 → 削除", async ({ request }) => {
    const ym = "2099-03"
    let createdId: string | null = null

    try {
      // --- 作成 ---
      await test.step("POST /api/budgets でカテゴリ予算を作成", async () => {
        const res = await request.post("/api/budgets", {
          data: { yearMonth: ym, categoryId: "cat_food", amount: 80000 },
        })
        expect(res.status()).toBe(200)
        const body = await res.json()
        expect(body.ok).toBe(true)
        expect(body.data.yearMonth).toBe(ym)
        expect(body.data.categoryId).toBe("cat_food")
        expect(body.data.amount).toBe(80000)
        createdId = body.data.id
      })

      // --- 一覧取得 ---
      await test.step("GET /api/budgets で一覧取得（実績額付き）", async () => {
        const res = await request.get(`/api/budgets?yearMonth=${ym}`)
        expect(res.status()).toBe(200)
        const body = await res.json()
        expect(body.ok).toBe(true)
        const item = body.data.find((b: { id: string }) => b.id === createdId)
        expect(item).toBeDefined()
        expect(item.amount).toBe(80000)
        expect(item.categoryName).toBe("食費")
        expect(typeof item.spent).toBe("number")
      })

      // --- 更新 ---
      await test.step("PATCH /api/budgets/[id] で金額更新", async () => {
        const res = await request.patch(`/api/budgets/${createdId}`, {
          data: { amount: 90000 },
        })
        expect(res.status()).toBe(200)
        const body = await res.json()
        expect(body.data.amount).toBe(90000)
      })

      // --- 削除 ---
      await test.step("DELETE /api/budgets/[id] で削除", async () => {
        const res = await request.delete(`/api/budgets/${createdId}`)
        expect(res.status()).toBe(200)
        const body = await res.json()
        expect(body.data.id).toBe(createdId)
        createdId = null
      })

      // --- 削除確認 ---
      await test.step("削除後に PATCH → 404", async () => {
        await expectApiError(
          await request.patch(`/api/budgets/${createdId ?? "deleted-id"}`, {
            data: { amount: 10000 },
          }),
          404, "NOT_FOUND",
        )
      })
    } finally {
      if (createdId) {
        await request.delete(`/api/budgets/${createdId}`)
      }
    }
  })

  test("全体予算（categoryId=null）の作成と取得", async ({ request }) => {
    const ym = "2099-04"
    let createdId: string | null = null

    try {
      const res = await request.post("/api/budgets", {
        data: { yearMonth: ym, categoryId: null, amount: 300000 },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.data.categoryId).toBeNull()
      expect(body.data.amount).toBe(300000)
      createdId = body.data.id

      // 一覧でspentがtotalSpent（全カテゴリ合計）であること
      const listRes = await request.get(`/api/budgets?yearMonth=${ym}`)
      const listBody = await listRes.json()
      const overall = listBody.data.find((b: { categoryId: string | null }) => b.categoryId === null)
      expect(overall).toBeDefined()
      expect(typeof overall.spent).toBe("number")
    } finally {
      if (createdId) {
        await request.delete(`/api/budgets/${createdId}`)
      }
    }
  })
})

// ----------------------------------------------------------------
// Upsert（同一キー重複防止）
// ----------------------------------------------------------------
test.describe("Upsert動作", () => {
  test("同一yearMonth + categoryId でPOST → IDが維持され金額のみ更新", async ({ request }) => {
    const ym = "2099-05"
    let createdId: string | null = null

    try {
      // 1回目: 作成
      const res1 = await request.post("/api/budgets", {
        data: { yearMonth: ym, categoryId: "cat_food", amount: 50000 },
      })
      expect(res1.status()).toBe(200)
      const body1 = await res1.json()
      createdId = body1.data.id

      // 2回目: 同一キーでPOST → upsert更新
      const res2 = await request.post("/api/budgets", {
        data: { yearMonth: ym, categoryId: "cat_food", amount: 60000 },
      })
      expect(res2.status()).toBe(200)
      const body2 = await res2.json()
      expect(body2.data.id).toBe(createdId) // 同じID
      expect(body2.data.amount).toBe(60000) // 金額更新

      // 一覧で1件のみ
      const listRes = await request.get(`/api/budgets?yearMonth=${ym}`)
      const listBody = await listRes.json()
      const foodBudgets = listBody.data.filter(
        (b: { categoryId: string | null }) => b.categoryId === "cat_food",
      )
      expect(foodBudgets).toHaveLength(1)
    } finally {
      if (createdId) {
        await request.delete(`/api/budgets/${createdId}`)
      }
    }
  })

  test("全体予算（null）の重複POST → 1件維持", async ({ request }) => {
    const ym = "2099-06"
    let createdId: string | null = null

    try {
      // 1回目
      const res1 = await request.post("/api/budgets", {
        data: { yearMonth: ym, categoryId: null, amount: 200000 },
      })
      const body1 = await res1.json()
      createdId = body1.data.id

      // 2回目: 同一月のnull categoryでPOST
      const res2 = await request.post("/api/budgets", {
        data: { yearMonth: ym, categoryId: null, amount: 250000 },
      })
      const body2 = await res2.json()
      expect(body2.data.id).toBe(createdId) // 同一ID維持
      expect(body2.data.amount).toBe(250000)

      // 一覧で全体予算が1件のみ
      const listRes = await request.get(`/api/budgets?yearMonth=${ym}`)
      const listBody = await listRes.json()
      const overallBudgets = listBody.data.filter(
        (b: { categoryId: string | null }) => b.categoryId === null,
      )
      expect(overallBudgets).toHaveLength(1)
    } finally {
      if (createdId) {
        await request.delete(`/api/budgets/${createdId}`)
      }
    }
  })
})

// ----------------------------------------------------------------
// 入力バリデーション
// ----------------------------------------------------------------
test.describe("入力バリデーション", () => {
  test("POST: 不正なyearMonth → 400", async ({ request }) => {
    await expectApiError(
      await request.post("/api/budgets", {
        data: { yearMonth: "2026-13", amount: 100000 },
      }),
      400, "VALIDATION_ERROR",
    )
  })

  test("POST: 負数のamount → 400", async ({ request }) => {
    await expectApiError(
      await request.post("/api/budgets", {
        data: { yearMonth: "2099-01", amount: -1000 },
      }),
      400, "VALIDATION_ERROR",
    )
  })

  test("POST: 存在しないcategoryId → 404", async ({ request }) => {
    await expectApiError(
      await request.post("/api/budgets", {
        data: { yearMonth: "2099-01", categoryId: "cat_nonexistent", amount: 50000 },
      }),
      404, "NOT_FOUND",
    )
  })

  test("PATCH: 負数のamount → 400", async ({ request }) => {
    const ym = "2099-09"
    let budgetId: string | null = null

    try {
      // まず予算を作成
      const createRes = await request.post("/api/budgets", {
        data: { yearMonth: ym, categoryId: "cat_food", amount: 10000 },
      })
      budgetId = (await createRes.json()).data.id

      // 負数amountでPATCH → 400
      await expectApiError(
        await request.patch(`/api/budgets/${budgetId}`, {
          data: { amount: -500 },
        }),
        400, "VALIDATION_ERROR",
      )
    } finally {
      if (budgetId) await request.delete(`/api/budgets/${budgetId}`)
    }
  })

  test("GET: yearMonth未指定 → 400", async ({ request }) => {
    await expectApiError(
      await request.get("/api/budgets"),
      400, "VALIDATION_ERROR",
    )
  })

  test("PATCH: 存在しないID → 404", async ({ request }) => {
    await expectApiError(
      await request.patch("/api/budgets/nonexistent-id-12345", {
        data: { amount: 50000 },
      }),
      404, "NOT_FOUND",
    )
  })

  test("DELETE: 存在しないID → 404", async ({ request }) => {
    await expectApiError(
      await request.delete("/api/budgets/nonexistent-id-12345"),
      404, "NOT_FOUND",
    )
  })
})
