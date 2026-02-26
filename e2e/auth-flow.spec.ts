import { test, expect } from "@playwright/test"

const email = process.env.E2E_ADMIN_EMAIL ?? "taro@example.com"
const password = process.env.E2E_ADMIN_PASSWORD ?? "password123"

test.describe("認証フロー回帰", () => {
  test("正しい認証情報でログイン → / へ遷移", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "unauth")
    await page.goto("/login")
    await page.getByLabel("メールアドレス").fill(email)
    await page.getByLabel("パスワード").fill(password)
    await page.getByRole("button", { name: "ログイン" }).click()
    await expect(page).toHaveURL("/")
  })

  test("不正パスワードでログイン → エラーメッセージ表示", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "unauth")
    await page.goto("/login")
    await page.getByLabel("メールアドレス").fill(email)
    await page.getByLabel("パスワード").fill("wrong-password")
    await page.getByRole("button", { name: "ログイン" }).click()
    await expect(
      page.getByText("メールアドレスまたはパスワードが正しくありません。")
    ).toBeVisible()
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test("未認証で / アクセス → /login にリダイレクト", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "unauth")
    await page.goto("/")
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test("未認証で /expenses アクセス → /login にリダイレクト", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "unauth")
    await page.goto("/expenses")
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test("callbackUrl 付きログイン後にその URL へ遷移", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "unauth")
    await page.goto("/login?callbackUrl=%2Fexpenses")
    await page.getByLabel("メールアドレス").fill(email)
    await page.getByLabel("パスワード").fill(password)
    await page.getByRole("button", { name: "ログイン" }).click()
    await expect(page).toHaveURL("/expenses")
  })

  test("外部 callbackUrl 指定でも外部遷移せず / にフォールバック", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "unauth")
    await page.goto("/login?callbackUrl=https%3A%2F%2Fevil.example")
    await page.getByLabel("メールアドレス").fill(email)
    await page.getByLabel("パスワード").fill(password)
    await page.getByRole("button", { name: "ログイン" }).click()
    await expect(page).toHaveURL("/")
  })

  test("ログアウト → /login に戻る", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "unauth")
    await page.goto("/settings")
    await page
      .locator('[data-testid="logout-button"]')
      .filter({ visible: true })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test("ログイン済みで /login アクセス → / にリダイレクト", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "unauth")
    await page.goto("/login")
    await expect(page).toHaveURL("/")
  })
})
