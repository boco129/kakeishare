import { test as setup, expect } from "@playwright/test"

const ADMIN_AUTH_FILE = "e2e/.auth/admin.json"

setup("admin ユーザーでログインし storageState を保存", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL ?? "taro@example.com"
  const password = process.env.E2E_ADMIN_PASSWORD ?? "password123"

  await page.goto("/login")
  await page.getByLabel("メールアドレス").fill(email)
  await page.getByLabel("パスワード").fill(password)
  await page.getByRole("button", { name: "ログイン" }).click()

  await expect(page).toHaveURL("/")
  await page.context().storageState({ path: ADMIN_AUTH_FILE })
})
