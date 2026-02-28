// AI API E2Eテスト — モックモードでの成功・失敗・未設定・レート制限を検証
// CIでは AI_MOCK_MODE=success で実行される（ANTHROPIC_API_KEY不要）
import { test, expect, type TestInfo } from "@playwright/test"

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "api")
})

function getBaseURL(testInfo: TestInfo) {
  return testInfo.project.use.baseURL ?? "http://localhost:3000"
}

/** AI_MOCK_MODE が設定されているか（ローカルでは未設定の場合がある） */
function isMockEnabled(): boolean {
  return !!process.env.AI_MOCK_MODE && process.env.AI_MOCK_MODE !== "off"
}

// ----------------------------------------------------------------
// /api/ai/report
// ----------------------------------------------------------------

test.describe("AI Report API", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("/api/dev/reset-rate-limit")
  })

  test("成功モード: レポートを返す", async ({ request }, testInfo) => {
    test.skip(!isMockEnabled(), "AI_MOCK_MODE 未設定のためスキップ")

    const res = await request.post(`${getBaseURL(testInfo)}/api/ai/report`, {
      data: { yearMonth: "2026-01" },
    })

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.report).toBeTruthy()
    expect(body.data.yearMonth).toBe("2026-01")
    expect(typeof body.data.remaining).toBe("number")
    expect(body.data.generatedAt).toBeTruthy()
  })

  test("バリデーションエラー: yearMonth不正で400", async ({ request }, testInfo) => {
    test.skip(!isMockEnabled(), "AI_MOCK_MODE 未設定のためスキップ")

    const res = await request.post(`${getBaseURL(testInfo)}/api/ai/report`, {
      data: { yearMonth: "invalid" },
    })
    expect(res.status()).toBe(400)
  })
})

// ----------------------------------------------------------------
// /api/ai/insights
// ----------------------------------------------------------------

test.describe("AI Insights API", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("/api/dev/reset-rate-limit")
  })

  test("成功モード: insights を返す", async ({ request }, testInfo) => {
    test.skip(!isMockEnabled(), "AI_MOCK_MODE 未設定のためスキップ")

    const res = await request.post(`${getBaseURL(testInfo)}/api/ai/insights`, {
      data: { yearMonth: "2026-01" },
    })

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.data.insights).toBeTruthy()
    expect(body.data.insights.suggestions).toBeInstanceOf(Array)
    expect(body.data.insights.forecast).toBeTruthy()
    expect(typeof body.data.remaining).toBe("number")
  })
})

// ----------------------------------------------------------------
// /api/ai/chat (SSE)
// ----------------------------------------------------------------

test.describe("AI Chat API", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("/api/dev/reset-rate-limit")
  })

  test("成功モード: SSEでtext→doneを返す", async ({ request }, testInfo) => {
    test.skip(!isMockEnabled(), "AI_MOCK_MODE 未設定のためスキップ")

    const res = await request.post(`${getBaseURL(testInfo)}/api/ai/chat`, {
      data: {
        message: "今月の食費は多いですか？",
        history: [],
        yearMonth: "2026-01",
      },
    })

    expect(res.status()).toBe(200)
    const text = await res.text()
    expect(text).toContain('"type":"done"')
  })

  test("バリデーションエラー: メッセージなしで400", async ({ request }, testInfo) => {
    test.skip(!isMockEnabled(), "AI_MOCK_MODE 未設定のためスキップ")

    const res = await request.post(`${getBaseURL(testInfo)}/api/ai/chat`, {
      data: {
        message: "",
        history: [],
        yearMonth: "2026-01",
      },
    })
    expect(res.status()).toBe(400)
  })
})

// ----------------------------------------------------------------
// レート制限テスト
// ----------------------------------------------------------------

test.describe("AI Rate Limits", () => {
  test("Report: 月5回上限で429", async ({ request }, testInfo) => {
    test.skip(!isMockEnabled(), "AI_MOCK_MODE 未設定のためスキップ")
    await request.post("/api/dev/reset-rate-limit")

    for (let i = 0; i < 6; i++) {
      const res = await request.post(`${getBaseURL(testInfo)}/api/ai/report`, {
        data: { yearMonth: "2026-01" },
      })

      if (i < 5) {
        expect(res.status()).toBe(200)
      } else {
        expect(res.status()).toBe(429)
      }
    }
  })

  test("Insights: 月5回上限で429", async ({ request }, testInfo) => {
    test.skip(!isMockEnabled(), "AI_MOCK_MODE 未設定のためスキップ")
    await request.post("/api/dev/reset-rate-limit")

    for (let i = 0; i < 6; i++) {
      const res = await request.post(
        `${getBaseURL(testInfo)}/api/ai/insights`,
        { data: { yearMonth: "2026-01" } },
      )

      if (i < 5) {
        expect(res.status()).toBe(200)
      } else {
        expect(res.status()).toBe(429)
      }
    }
  })

  test("Chat: 日次20回上限で429", async ({ request }, testInfo) => {
    test.skip(!isMockEnabled(), "AI_MOCK_MODE 未設定のためスキップ")
    await request.post("/api/dev/reset-rate-limit")

    for (let i = 0; i < 21; i++) {
      const res = await request.post(`${getBaseURL(testInfo)}/api/ai/chat`, {
        data: {
          message: `テスト${i}`,
          history: [],
          yearMonth: "2026-01",
        },
      })

      if (i < 20) {
        expect(res.status()).toBe(200)
      } else {
        expect(res.status()).toBe(429)
      }
    }
  })
})

// ----------------------------------------------------------------
// 認証なしでのアクセス拒否
// ----------------------------------------------------------------

test.describe("AI API 認証必須", () => {
  test("未認証でReport APIに401", async ({ playwright }, testInfo) => {
    test.skip(testInfo.project.name !== "api")

    const context = await playwright.request.newContext({
      baseURL: getBaseURL(testInfo),
      storageState: { cookies: [], origins: [] },
    })
    const res = await context.post("/api/ai/report", {
      data: { yearMonth: "2026-01" },
    })
    expect(res.status()).toBe(401)
    await context.dispose()
  })
})
