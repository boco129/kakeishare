import { test, expect } from "@playwright/test"

test.describe("ルート保護リダイレクト", () => {
  test("未認証で / にアクセスすると /login へリダイレクト", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "unauth")
    await page.goto("/")
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })

  test("認証済みで /login にアクセスすると / へリダイレクト", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "unauth")
    await page.goto("/login")
    await expect(page).toHaveURL("/")
  })
})
