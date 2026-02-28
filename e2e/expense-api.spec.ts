// 支出API E2E テスト — 認可制御 / CRUD / プライバシーフィルタ / 所有者制御
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
  test("未認証リクエスト → 全HTTPメソッドで 401", async ({ playwright }, testInfo) => {
    const unauthed = await playwright.request.newContext({
      baseURL: getBaseURL(testInfo),
    })

    try {
      await expectApiError(await unauthed.get("/api/expenses"), 401, "UNAUTHORIZED")
      await expectApiError(
        await unauthed.post("/api/expenses", {
          data: { date: "2026-01-01", amount: 100, description: "test", isSubstitute: false },
        }),
        401, "UNAUTHORIZED",
      )
      await expectApiError(await unauthed.get("/api/expenses/dummy-id"), 401, "UNAUTHORIZED")
      await expectApiError(
        await unauthed.patch("/api/expenses/dummy-id", { data: { description: "updated" } }),
        401, "UNAUTHORIZED",
      )
      await expectApiError(await unauthed.delete("/api/expenses/dummy-id"), 401, "UNAUTHORIZED")
    } finally {
      await unauthed.dispose()
    }
  })

  test("認証済みで一覧取得 → 200", async ({ request }) => {
    const res = await request.get("/api/expenses")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(Array.isArray(body.data.items)).toBe(true)
  })
})

// ----------------------------------------------------------------
// CRUD ライフサイクル
// ----------------------------------------------------------------
test.describe("CRUD操作", () => {
  test("支出の作成 → 取得 → 更新 → 削除", async ({ request }) => {
    const unique = `e2e-crud-${Date.now()}`
    let createdId: string | null = null
    let deletedId: string | null = null

    try {
      // --- 作成 ---
      await test.step("POST /api/expenses で支出を作成", async () => {
        const res = await request.post("/api/expenses", {
          data: {
            date: "2026-01-31",
            amount: 1234,
            description: unique,
            isSubstitute: false,
          },
        })
        expect(res.status()).toBe(200)
        const body = await res.json()
        expect(body.ok).toBe(true)
        expect(body.data.description).toBe(unique)
        expect(body.data.amount).toBe(1234)
        expect(body.data.source).toBe("MANUAL")
        expect(body.data.confirmed).toBe(true)
        createdId = body.data.id
      })

      // --- 個別取得 ---
      await test.step("GET /api/expenses/[id] で取得", async () => {
        const res = await request.get(`/api/expenses/${createdId}`)
        expect(res.status()).toBe(200)
        const body = await res.json()
        expect(body.data.id).toBe(createdId)
        expect(body.data.description).toBe(unique)
      })

      // --- 更新 ---
      await test.step("PATCH /api/expenses/[id] で更新", async () => {
        const res = await request.patch(`/api/expenses/${createdId}`, {
          data: { description: `${unique}-updated`, amount: 5678 },
        })
        expect(res.status()).toBe(200)
        const body = await res.json()
        expect(body.data.description).toBe(`${unique}-updated`)
        expect(body.data.amount).toBe(5678)
      })

      // --- 削除 ---
      await test.step("DELETE /api/expenses/[id] で削除", async () => {
        const res = await request.delete(`/api/expenses/${createdId}`)
        expect(res.status()).toBe(200)
        const body = await res.json()
        expect(body.data.id).toBe(createdId)
        deletedId = createdId
        createdId = null
      })

      // --- 削除確認 ---
      await test.step("削除後に GET → 404", async () => {
        await expectApiError(
          await request.get(`/api/expenses/${deletedId}`),
          404, "NOT_FOUND",
        )
      })
    } finally {
      if (createdId) {
        await request.delete(`/api/expenses/${createdId}`)
      }
    }
  })

  test("存在しない支出の更新 → 404", async ({ request }) => {
    await expectApiError(
      await request.patch("/api/expenses/nonexistent-id-12345", {
        data: { description: "should-fail" },
      }),
      404, "NOT_FOUND",
    )
  })

  test("存在しない支出の削除 → 404", async ({ request }) => {
    await expectApiError(
      await request.delete("/api/expenses/nonexistent-id-12345"),
      404, "NOT_FOUND",
    )
  })
})

// ----------------------------------------------------------------
// 入力バリデーション
// ----------------------------------------------------------------
test.describe("入力バリデーション", () => {
  test("POST: amount=0 は 400", async ({ request }) => {
    await expectApiError(
      await request.post("/api/expenses", {
        data: { date: "2026-01-31", amount: 0, description: "zero", isSubstitute: false },
      }),
      400, "VALIDATION_ERROR",
    )
  })

  test("POST: actualAmount > amount は 400", async ({ request }) => {
    await expectApiError(
      await request.post("/api/expenses", {
        data: {
          date: "2026-01-31",
          amount: 1000,
          actualAmount: 1200,
          isSubstitute: true,
          description: "invalid",
        },
      }),
      400, "VALIDATION_ERROR",
    )
  })

  test("POST: 不正な categoryId は 400", async ({ request }) => {
    await expectApiError(
      await request.post("/api/expenses", {
        data: {
          date: "2026-01-31",
          amount: 500,
          description: "bad-cat",
          isSubstitute: false,
          categoryId: "nonexistent-category",
        },
      }),
      400, "VALIDATION_ERROR",
    )
  })
})

// ----------------------------------------------------------------
// プライバシーフィルタ（太郎が花子の支出を閲覧）
// ----------------------------------------------------------------
test.describe("プライバシーフィルタ", () => {
  // 太郎（admin）でログイン済み → 花子の支出を閲覧
  // シードデータ:
  //   exp_w01: PUBLIC (食費, マルエツ)
  //   exp_w05: AMOUNT_ONLY (衣服・美容, ユニクロ)
  //   exp_w06: AMOUNT_ONLY (交際費, 居酒屋 魚民, 立替あり)
  //   exp_w15: CATEGORY_TOTAL (個人娯楽, 漫画全巻ドットコム)

  test("PUBLIC支出 → 全フィールド返却", async ({ request }) => {
    const res = await request.get("/api/expenses/exp_w01")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.description).toBe("マルエツ 豊洲店")
    expect(body.data.amount).toBe(2480)
    expect(body.data.masked).toBe(false)
  })

  test("AMOUNT_ONLY支出 → descriptionが「個人支出」に置換、フィールドがマスク", async ({ request }) => {
    const res = await request.get("/api/expenses/exp_w05")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.description).toBe("個人支出")
    expect(body.data.memo).toBeNull()
    expect(body.data.isSubstitute).toBe(false)
    expect(body.data.actualAmount).toBeNull()
    expect(body.data.masked).toBe(true)
    expect(body.data.amount).toBe(5980)
    expect(body.data.visibility).toBe("AMOUNT_ONLY")
  })

  test("AMOUNT_ONLY立替支出 → 立替情報もマスク", async ({ request }) => {
    const res = await request.get("/api/expenses/exp_w06")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.description).toBe("個人支出")
    expect(body.data.isSubstitute).toBe(false)
    expect(body.data.actualAmount).toBeNull()
    expect(body.data.memo).toBeNull()
    expect(body.data.masked).toBe(true)
  })

  test("CATEGORY_TOTAL支出 → 個別取得で 404", async ({ request }) => {
    await expectApiError(
      await request.get("/api/expenses/exp_w15"),
      404, "NOT_FOUND",
    )
  })

  test("CATEGORY_TOTAL支出 → 一覧の items に含まれず categoryTotals に集計", async ({ request }) => {
    const res = await request.get("/api/expenses?userId=user_wife&limit=100")
    expect(res.status()).toBe(200)
    const body = await res.json()

    // items に CATEGORY_TOTAL の支出が含まれない
    const catTotalItem = body.data.items.find(
      (item: { id: string }) => item.id === "exp_w15",
    )
    expect(catTotalItem).toBeUndefined()

    // categoryTotals に個人娯楽カテゴリの集計がある
    const hobbyTotal = body.data.categoryTotals.find(
      (ct: { categoryName: string }) => ct.categoryName === "個人娯楽",
    )
    expect(hobbyTotal).toBeDefined()
    expect(hobbyTotal.totalAmount).toBe(4800)
    expect(hobbyTotal.count).toBe(1)
  })

  test("CATEGORY_TOTAL支出 → 所有者本人は個別取得で 200", async ({ playwright }, testInfo) => {
    await withMemberRequest(playwright, getBaseURL(testInfo), async (hanakoReq) => {
      const res = await hanakoReq.get("/api/expenses/exp_w15")
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data.description).toBe("漫画全巻ドットコム")
      expect(body.data.masked).toBe(false)
    })
  })
})

// ----------------------------------------------------------------
// 所有者制御
// ----------------------------------------------------------------
test.describe("所有者制御", () => {
  test("自分の支出の更新 → 成功", async ({ request }) => {
    let id: string | null = null
    try {
      const createRes = await request.post("/api/expenses", {
        data: { date: "2026-01-31", amount: 100, description: "owner-test", isSubstitute: false },
      })
      id = (await createRes.json()).data.id

      const updateRes = await request.patch(`/api/expenses/${id}`, {
        data: { description: "owner-test-updated" },
      })
      expect(updateRes.status()).toBe(200)
      const body = await updateRes.json()
      expect(body.data.description).toBe("owner-test-updated")
    } finally {
      if (id) await request.delete(`/api/expenses/${id}`)
    }
  })

  test("他人の支出の更新 → 403", async ({ playwright }, testInfo) => {
    await withMemberRequest(playwright, getBaseURL(testInfo), async (hanakoReq) => {
      await expectApiError(
        await hanakoReq.patch("/api/expenses/exp_h01", { data: { description: "should-fail" } }),
        403, "FORBIDDEN",
      )
    })
  })

  test("自分の支出の削除 → 成功", async ({ request }) => {
    const createRes = await request.post("/api/expenses", {
      data: { date: "2026-01-31", amount: 100, description: "delete-test", isSubstitute: false },
    })
    const id = (await createRes.json()).data.id

    const deleteRes = await request.delete(`/api/expenses/${id}`)
    expect(deleteRes.status()).toBe(200)
    const body = await deleteRes.json()
    expect(body.data.id).toBe(id)
  })

  test("他人の支出の削除 → 403", async ({ playwright }, testInfo) => {
    await withMemberRequest(playwright, getBaseURL(testInfo), async (hanakoReq) => {
      await expectApiError(
        await hanakoReq.delete("/api/expenses/exp_h01"),
        403, "FORBIDDEN",
      )
    })
  })
})
