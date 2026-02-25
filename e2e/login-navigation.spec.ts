import { test, expect } from "@playwright/test"

test.describe("ログイン画面のナビゲーション", () => {
  test("/login ではメインナビゲーションが表示されない", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "unauth")
    await page.goto("/login")
    // Route Group 分離により、(auth) 配下にはナビコンポーネントが含まれない
    await expect(
      page.locator('[aria-label="メインナビゲーション"]')
    ).toHaveCount(0)
  })
})
