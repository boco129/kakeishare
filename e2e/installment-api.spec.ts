// 分割払いAPI E2E テスト — 認可制御 / CRUD / 所有者制御 / プライバシーフィルタ
import { test, expect, type APIResponse, type TestInfo } from "@playwright/test"

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "api")
})

function getBaseURL(testInfo: TestInfo) {
  return testInfo.project.use.baseURL ?? "http://localhost:3000"
}

// ----------------------------------------------------------------
// ヘルパー
// ----------------------------------------------------------------

async function expectApiError(res: APIResponse, status: number, code: string) {
  expect(res.status()).toBe(status)
  const body = await res.json()
  expect(body.ok).toBe(false)
  expect(body.error.code).toBe(code)
}

// ----------------------------------------------------------------
// 認可制御
// ----------------------------------------------------------------
test.describe("認可制御", () => {
  test("未認証リクエスト → 全メソッドで 401", async ({ playwright }, testInfo) => {
    const unauthed = await playwright.request.newContext({
      baseURL: getBaseURL(testInfo),
    })

    try {
      await expectApiError(await unauthed.get("/api/installments"), 401, "UNAUTHORIZED")
      await expectApiError(
        await unauthed.post("/api/installments", {
          data: {
            description: "test",
            totalAmount: 10000,
            monthlyAmount: 5000,
            totalMonths: 2,
            startDate: "2026-01-01",
          },
        }),
        401, "UNAUTHORIZED",
      )
      await expectApiError(await unauthed.get("/api/installments/dummy-id"), 401, "UNAUTHORIZED")
      await expectApiError(
        await unauthed.patch("/api/installments/dummy-id", { data: { description: "x" } }),
        401, "UNAUTHORIZED",
      )
      await expectApiError(await unauthed.delete("/api/installments/dummy-id"), 401, "UNAUTHORIZED")
    } finally {
      await unauthed.dispose()
    }
  })

  test("認証済みで一覧取得 → 200", async ({ request }) => {
    const res = await request.get("/api/installments")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(Array.isArray(body.data.items)).toBe(true)
    expect(typeof body.data.summary.totalCount).toBe("number")
  })
})

// ----------------------------------------------------------------
// CRUD ライフサイクル
// ----------------------------------------------------------------
test.describe("CRUD操作", () => {
  test("分割払いの作成 → 取得 → 更新 → 削除", async ({ request }) => {
    let createdId: string | null = null

    try {
      // --- 作成 ---
      await test.step("POST /api/installments で分割払いを作成", async () => {
        const res = await request.post("/api/installments", {
          data: {
            description: "E2Eテスト分割払い",
            totalAmount: 60000,
            monthlyAmount: 10000,
            totalMonths: 6,
            startDate: "2026-03-01",
          },
        })
        expect(res.status()).toBe(200)
        const body = await res.json()
        expect(body.ok).toBe(true)
        expect(body.data.description).toBe("E2Eテスト分割払い")
        expect(body.data.totalAmount).toBe(60000)
        expect(body.data.monthlyAmount).toBe(10000)
        expect(body.data.totalMonths).toBe(6)
        // remainingMonths省略時はtotalMonthsが補完される
        expect(body.data.remainingMonths).toBe(6)
        expect(body.data.remainingAmount).toBe(60000)
        expect(body.data.progressRate).toBe(0)
        expect(body.data.masked).toBe(false)
        createdId = body.data.id
      })

      // --- 個別取得 ---
      await test.step("GET /api/installments/[id] で取得", async () => {
        const res = await request.get(`/api/installments/${createdId}`)
        expect(res.status()).toBe(200)
        const body = await res.json()
        expect(body.data.id).toBe(createdId)
        expect(body.data.remainingAmount).toBe(60000)
      })

      // --- 更新 ---
      await test.step("PATCH /api/installments/[id] で更新", async () => {
        const res = await request.patch(`/api/installments/${createdId}`, {
          data: { remainingMonths: 3, description: "E2Eテスト更新済み" },
        })
        expect(res.status()).toBe(200)
        const body = await res.json()
        expect(body.data.description).toBe("E2Eテスト更新済み")
        expect(body.data.remainingMonths).toBe(3)
        expect(body.data.remainingAmount).toBe(30000)
        expect(body.data.progressRate).toBe(50.0)
      })

      // --- 削除 ---
      await test.step("DELETE /api/installments/[id] で削除", async () => {
        const res = await request.delete(`/api/installments/${createdId}`)
        expect(res.status()).toBe(200)
        const body = await res.json()
        expect(body.data.id).toBe(createdId)
        createdId = null
      })

      // --- 削除確認 ---
      await test.step("削除後に GET → 404", async () => {
        await expectApiError(
          await request.get(`/api/installments/${createdId ?? "deleted-id"}`),
          404, "NOT_FOUND",
        )
      })
    } finally {
      if (createdId) {
        await request.delete(`/api/installments/${createdId}`)
      }
    }
  })

  test("remainingMonths明示指定でPOST", async ({ request }) => {
    let id: string | null = null
    try {
      const res = await request.post("/api/installments", {
        data: {
          description: "途中開始テスト",
          totalAmount: 30000,
          monthlyAmount: 10000,
          totalMonths: 3,
          remainingMonths: 1,
          startDate: "2026-01-01",
        },
      })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.data.remainingMonths).toBe(1)
      expect(body.data.remainingAmount).toBe(10000)
      expect(body.data.progressRate).toBe(66.7)
      id = body.data.id
    } finally {
      if (id) await request.delete(`/api/installments/${id}`)
    }
  })

  test("存在しないIDの更新 → 404", async ({ request }) => {
    await expectApiError(
      await request.patch("/api/installments/nonexistent-id-12345", {
        data: { description: "should-fail" },
      }),
      404, "NOT_FOUND",
    )
  })

  test("存在しないIDの削除 → 404", async ({ request }) => {
    await expectApiError(
      await request.delete("/api/installments/nonexistent-id-12345"),
      404, "NOT_FOUND",
    )
  })
})

// ----------------------------------------------------------------
// 所有者制御
// ----------------------------------------------------------------
test.describe("所有者制御", () => {
  // 太郎(admin)は花子の分割払いを編集・削除できない
  // inst_01 = 花子のAMOUNT_ONLY分割払い
  test("他人の分割払いの更新 → 403", async ({ request }) => {
    await expectApiError(
      await request.patch("/api/installments/inst_01", {
        data: { description: "should-fail" },
      }),
      403, "FORBIDDEN",
    )
  })

  test("他人の分割払いの削除 → 403", async ({ request }) => {
    await expectApiError(
      await request.delete("/api/installments/inst_01"),
      403, "FORBIDDEN",
    )
  })

  test("自分の分割払いの更新 → 成功", async ({ request }) => {
    // inst_02 = 太郎のPUBLIC分割払い
    const res = await request.patch("/api/installments/inst_02", {
      data: { description: "Apple.com/bill MacBook修理" },
    })
    expect(res.status()).toBe(200)
  })
})

// ----------------------------------------------------------------
// プライバシーフィルタ
// ----------------------------------------------------------------
test.describe("プライバシーフィルタ", () => {
  // 太郎(admin)でログイン済み
  // inst_01 = 花子のAMOUNT_ONLY → descriptionマスク

  test("相手のAMOUNT_ONLY → descriptionが個人支出にマスク", async ({ request }) => {
    const res = await request.get("/api/installments/inst_01")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.description).toBe("個人支出")
    expect(body.data.masked).toBe(true)
    // 金額情報は閲覧可能
    expect(body.data.totalAmount).toBe(12000)
  })

  test("自分のPUBLIC → 全フィールド閲覧可能", async ({ request }) => {
    const res = await request.get("/api/installments/inst_02")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.description).toBe("Apple.com/bill MacBook修理")
    expect(body.data.masked).toBe(false)
  })

  test("一覧でAMOUNT_ONLYのdescriptionがマスクされている", async ({ request }) => {
    const res = await request.get("/api/installments")
    expect(res.status()).toBe(200)
    const body = await res.json()
    // 花子のAMOUNT_ONLY分割払いがマスクされている
    const maskedItem = body.data.items.find(
      (item: { id: string }) => item.id === "inst_01",
    )
    expect(maskedItem).toBeDefined()
    expect(maskedItem.description).toBe("個人支出")
    expect(maskedItem.masked).toBe(true)
  })
})

// ----------------------------------------------------------------
// ステータスフィルタ
// ----------------------------------------------------------------
test.describe("ステータスフィルタ", () => {
  test("status=active → remainingMonths > 0 のみ", async ({ request }) => {
    const res = await request.get("/api/installments?status=active")
    expect(res.status()).toBe(200)
    const body = await res.json()
    for (const item of body.data.items) {
      expect(item.remainingMonths).toBeGreaterThan(0)
    }
  })

  test("status=all → 全件取得", async ({ request }) => {
    const res = await request.get("/api/installments?status=all")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  test("status=completed → remainingMonths = 0 のみ（プライバシー適用）", async ({ request }) => {
    const res = await request.get("/api/installments?status=completed")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    // completedにもプライバシーフィルタが適用されていること
    for (const item of body.data.items) {
      expect(item.remainingMonths).toBe(0)
    }
    expect(typeof body.data.summary.totalCount).toBe("number")
    expect(typeof body.data.summary.hiddenCount).toBe("number")
  })
})

// ----------------------------------------------------------------
// 入力バリデーション
// ----------------------------------------------------------------
test.describe("入力バリデーション", () => {
  test("POST: totalMonths=0 → 400", async ({ request }) => {
    await expectApiError(
      await request.post("/api/installments", {
        data: {
          description: "test",
          totalAmount: 10000,
          monthlyAmount: 5000,
          totalMonths: 0,
          startDate: "2026-01-01",
        },
      }),
      400, "VALIDATION_ERROR",
    )
  })

  test("POST: remainingMonths > totalMonths → 400", async ({ request }) => {
    await expectApiError(
      await request.post("/api/installments", {
        data: {
          description: "test",
          totalAmount: 10000,
          monthlyAmount: 5000,
          totalMonths: 3,
          remainingMonths: 5,
          startDate: "2026-01-01",
        },
      }),
      400, "VALIDATION_ERROR",
    )
  })

  test("PATCH: 既存値との整合性チェック（remainingMonths単独更新）", async ({ request }) => {
    let id: string | null = null
    try {
      // totalMonths=3で作成
      const createRes = await request.post("/api/installments", {
        data: {
          description: "整合性テスト",
          totalAmount: 30000,
          monthlyAmount: 10000,
          totalMonths: 3,
          startDate: "2026-01-01",
        },
      })
      id = (await createRes.json()).data.id

      // remainingMonths=5（> totalMonths=3）でPATCH → 400
      await expectApiError(
        await request.patch(`/api/installments/${id}`, {
          data: { remainingMonths: 5 },
        }),
        400, "VALIDATION_ERROR",
      )
    } finally {
      if (id) await request.delete(`/api/installments/${id}`)
    }
  })

  test("POST: 負数のamount → 400", async ({ request }) => {
    await expectApiError(
      await request.post("/api/installments", {
        data: {
          description: "test",
          totalAmount: -1000,
          monthlyAmount: 5000,
          totalMonths: 3,
          startDate: "2026-01-01",
        },
      }),
      400, "VALIDATION_ERROR",
    )
  })
})
