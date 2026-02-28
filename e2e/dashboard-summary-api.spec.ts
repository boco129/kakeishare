// ダッシュボード集計API E2E テスト — 認可制御 / レスポンス構造 / クエリパラメータ
import { test, expect, type APIResponse, type TestInfo } from "@playwright/test"

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "api")
})

function getBaseURL(testInfo: TestInfo) {
  return testInfo.project.use.baseURL ?? "http://localhost:3000"
}

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
  test("未認証リクエスト → 401", async ({ playwright }, testInfo) => {
    const unauthed = await playwright.request.newContext({
      baseURL: getBaseURL(testInfo),
    })

    try {
      await expectApiError(
        await unauthed.get("/api/dashboard/summary?yearMonth=2026-01"),
        401, "UNAUTHORIZED",
      )
    } finally {
      await unauthed.dispose()
    }
  })

  test("認証済みで取得 → 200", async ({ request }) => {
    const res = await request.get("/api/dashboard/summary?yearMonth=2026-01")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})

// ----------------------------------------------------------------
// レスポンス構造
// ----------------------------------------------------------------
test.describe("レスポンス構造", () => {
  test("全セクションが返却される", async ({ request }) => {
    const res = await request.get("/api/dashboard/summary?yearMonth=2026-01")
    expect(res.status()).toBe(200)
    const body = await res.json()
    const data = body.data

    // yearMonth
    expect(data.yearMonth).toBe("2026-01")

    // monthly
    expect(typeof data.monthly.totalAmount).toBe("number")
    expect(typeof data.monthly.count).toBe("number")

    // categories
    expect(Array.isArray(data.categories)).toBe(true)

    // coupleRatio
    expect(data.coupleRatio.user).toBeDefined()
    expect(data.coupleRatio.partner).toBeDefined()
    expect(typeof data.coupleRatio.user.total).toBe("number")
    expect(typeof data.coupleRatio.user.percentage).toBe("number")

    // trend
    expect(Array.isArray(data.trend)).toBe(true)

    // budget
    expect(typeof data.budget.totalBudget).toBe("number")
    expect(typeof data.budget.totalSpent).toBe("number")
    expect(typeof data.budget.remainingBudget).toBe("number")
    expect(typeof data.budget.budgetUsageRate).toBe("number")

    // installment
    expect(typeof data.installment.activeCount).toBe("number")
    expect(typeof data.installment.totalMonthlyAmount).toBe("number")
    expect(Array.isArray(data.installment.items)).toBe(true)

    // csvImport
    expect(typeof data.csvImport.pendingConfirmCount).toBe("number")
    expect(Array.isArray(data.csvImport.unimportedMonths)).toBe(true)
  })

  test("カテゴリ別集計にシードデータが反映されている", async ({ request }) => {
    const res = await request.get("/api/dashboard/summary?yearMonth=2026-01")
    const body = await res.json()
    const categories = body.data.categories

    // シードデータに2026-01の支出あり → カテゴリが1件以上
    expect(categories.length).toBeGreaterThan(0)

    for (const cat of categories) {
      expect(typeof cat.amount).toBe("number")
      expect(typeof cat.percentage).toBe("number")
      expect(typeof cat.count).toBe("number")
      expect(cat.amount).toBeGreaterThanOrEqual(0)
    }
  })

  test("月次トレンドがデフォルト6ヶ月分", async ({ request }) => {
    const res = await request.get("/api/dashboard/summary?yearMonth=2026-01")
    const body = await res.json()
    expect(body.data.trend.length).toBe(6)
  })
})

// ----------------------------------------------------------------
// クエリパラメータ
// ----------------------------------------------------------------
test.describe("クエリパラメータ", () => {
  test("months=3 でトレンドが3ヶ月分", async ({ request }) => {
    const res = await request.get("/api/dashboard/summary?yearMonth=2026-01&months=3")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.trend.length).toBe(3)
  })

  test("months=12 でトレンドが12ヶ月分", async ({ request }) => {
    const res = await request.get("/api/dashboard/summary?yearMonth=2026-01&months=12")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.trend.length).toBe(12)
  })

  test("yearMonth未指定 → 400", async ({ request }) => {
    await expectApiError(
      await request.get("/api/dashboard/summary"),
      400, "VALIDATION_ERROR",
    )
  })

  test("yearMonth不正形式 → 400", async ({ request }) => {
    await expectApiError(
      await request.get("/api/dashboard/summary?yearMonth=invalid"),
      400, "VALIDATION_ERROR",
    )
  })

  test("months未指定 → デフォルト6ヶ月", async ({ request }) => {
    const res = await request.get("/api/dashboard/summary?yearMonth=2026-01")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.trend.length).toBe(6)
  })

  test("months=0 → 400", async ({ request }) => {
    await expectApiError(
      await request.get("/api/dashboard/summary?yearMonth=2026-01&months=0"),
      400, "VALIDATION_ERROR",
    )
  })

  test("months=25 → 400", async ({ request }) => {
    await expectApiError(
      await request.get("/api/dashboard/summary?yearMonth=2026-01&months=25"),
      400, "VALIDATION_ERROR",
    )
  })
})

// ----------------------------------------------------------------
// プライバシーフィルタ（分割払いセクション）
// ----------------------------------------------------------------
test.describe("プライバシーフィルタ", () => {
  // 太郎(admin)でログイン済み
  // inst_01 = 花子のAMOUNT_ONLY分割払い

  test("分割払いのAMOUNT_ONLYがマスクされている", async ({ request }) => {
    const res = await request.get("/api/dashboard/summary?yearMonth=2026-01")
    expect(res.status()).toBe(200)
    const body = await res.json()
    const items = body.data.installment.items

    // 花子のAMOUNT_ONLY分割払いがマスクされている
    const maskedItem = items.find(
      (item: { id: string }) => item.id === "inst_01",
    )
    expect(maskedItem).toBeDefined()
    expect(maskedItem.description).toBe("個人支出")
  })

  test("自分のPUBLIC分割払いは全フィールド閲覧可能", async ({ request }) => {
    const res = await request.get("/api/dashboard/summary?yearMonth=2026-01")
    expect(res.status()).toBe(200)
    const body = await res.json()
    const items = body.data.installment.items

    // inst_02 = 太郎のPUBLIC分割払い
    const ownItem = items.find(
      (item: { id: string }) => item.id === "inst_02",
    )
    expect(ownItem).toBeDefined()
    expect(ownItem.description).not.toBe("個人支出")
  })
})
