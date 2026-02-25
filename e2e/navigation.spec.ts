import { test, expect, type Page } from "@playwright/test"

// ナビゲーションアイテム定義（navigation-items.ts と同期）
const NAV_ITEMS = [
  { path: "/", label: "ホーム" },
  { path: "/expenses", label: "支出" },
  { path: "/review", label: "レビュー" },
  { path: "/settings", label: "設定" },
]

/** 表示中のナビゲーション領域を取得（mobile: bottom-tab-nav, desktop: sidebar-nav） */
function visibleNav(page: Page, projectName: string) {
  return projectName === "desktop"
    ? page.getByTestId("sidebar-nav")
    : page.getByTestId("bottom-tab-nav")
}

// --- レスポンシブ表示切替テスト ---

test.describe("レスポンシブナビゲーション表示切替", () => {
  test("1024px: 下部タブバーが表示され、サイドバーは非表示", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile")
    await page.goto("/")
    await expect(page.getByTestId("bottom-tab-nav")).toBeVisible()
    await expect(page.getByTestId("sidebar-nav")).toBeHidden()
  })

  test("1025px: サイドバーが表示され、下部タブバーは非表示", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop")
    await page.goto("/")
    await expect(page.getByTestId("sidebar-nav")).toBeVisible()
    await expect(page.getByTestId("bottom-tab-nav")).toBeHidden()
  })
})

// --- aria-current="page" テスト（認証済みprojectのみ） ---

test.describe("aria-current=page が正しいタブに付与される", () => {
  for (const item of NAV_ITEMS) {
    test(`${item.path} で「${item.label}」がアクティブ`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name === "unauth")
      await page.goto(item.path)
      // 表示中のナビ内でaria-current="page"のリンクを検証
      const nav = visibleNav(page, testInfo.project.name)
      const activeLink = nav.locator('a[aria-current="page"]')
      await expect(activeLink).toHaveCount(1)
      await expect(activeLink).toContainText(item.label)
    })
  }
})

// --- ナビリンク遷移テスト（認証済みprojectのみ） ---

test.describe("ナビリンク押下で想定URLに遷移する", () => {
  for (const item of NAV_ITEMS) {
    test(`「${item.label}」リンクで ${item.path} に遷移`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name === "unauth")
      // ホームから開始（ホーム自身のテストでは /settings から開始）
      const startPath = item.path === "/" ? "/settings" : "/"
      await page.goto(startPath)
      // ナビ領域にスコープして誤クリック防止
      const nav = visibleNav(page, testInfo.project.name)
      await nav.getByRole("link", { name: item.label }).click()
      await expect(page).toHaveURL(item.path)
    })
  }
})
