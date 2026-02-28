import { test as setup, expect } from "@playwright/test"

const ADMIN_AUTH_FILE = "e2e/.auth/admin.json"
const MEMBER_AUTH_FILE = "e2e/.auth/member.json"

/** ログインして storageState を保存する共通処理 */
async function loginAndSave(
  browser: import("@playwright/test").Browser,
  request: import("@playwright/test").APIRequestContext,
  baseURL: string,
  email: string,
  password: string,
  savePath: string,
) {
  await request.post("/api/dev/reset-rate-limit")
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  await page.goto("/login")
  await page.getByLabel("メールアドレス").fill(email)
  await page.getByLabel("パスワード").fill(password)
  await page.getByRole("button", { name: "ログイン" }).click()
  await expect(page).toHaveURL("/")
  await context.storageState({ path: savePath })
  await context.close()
}

setup("admin/member ユーザーでログインし storageState を保存", async ({ browser, request }, testInfo) => {
  const baseURL = testInfo.project.use.baseURL ?? "http://localhost:3000"

  await loginAndSave(
    browser, request, baseURL,
    process.env.E2E_ADMIN_EMAIL ?? "taro@example.com",
    process.env.E2E_ADMIN_PASSWORD ?? "password123",
    ADMIN_AUTH_FILE,
  )
  await loginAndSave(
    browser, request, baseURL,
    process.env.E2E_MEMBER_EMAIL ?? "hanako@example.com",
    process.env.E2E_MEMBER_PASSWORD ?? "password123",
    MEMBER_AUTH_FILE,
  )
})
