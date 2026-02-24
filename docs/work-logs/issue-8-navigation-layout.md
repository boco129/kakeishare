# Issue #8: モバイル下部タブバー + PCサイドバーナビゲーション

## 対応日
2026-02-24

## ブランチ
`feature/issue-8-navigation-layout` (from `develop`)

## 作成ファイル
- `src/components/layout/navigation-items.ts` — ナビゲーション定義（4タブ）
- `src/components/layout/navigation-utils.ts` — アクティブ判定ユーティリティ
- `src/components/layout/bottom-tab-bar.tsx` — モバイル下部タブバー（Client Component）
- `src/components/layout/sidebar-nav.tsx` — PCサイドバーナビ（Client Component）
- `src/components/layout/app-shell.tsx` — レスポンシブラッパー（Server Component）
- `src/app/(app)/layout.tsx` — (app)グループレイアウト（認証ガード集約）
- `src/app/(app)/expenses/page.tsx` — 支出ページ（プレースホルダー）
- `src/app/(app)/review/page.tsx` — レビューページ（プレースホルダー）

## 変更ファイル
- `src/app/globals.css` — カスタムブレークポイント `--breakpoint-desktop: 64.0625rem`（1025px）追加
- `src/app/layout.tsx` — `Viewport` export追加（`viewportFit: "cover"`）
- `src/app/(app)/page.tsx` — Route Group移動 + レイアウト調整 + 認証redirect削除
- `src/app/(app)/settings/page.tsx` — Route Group移動 + レイアウト調整 + 認証redirect削除
- `src/app/(auth)/login/` — Route Group移動のみ（内容変更なし）

## 実装詳細

### アーキテクチャ
- **Route Group分離**: `(app)`グループ（ナビあり）と`(auth)`グループ（ナビなし）でレイアウトを分離
- **ナビ定義集約**: `navigation-items.ts`にNAV_ITEMSを定義、タブバーとサイドバーが共通参照
- **アクティブ判定共通化**: `isPathActive()`を1箇所に定義して両コンポーネントで再利用

### レスポンシブ対応
- ~1024px: 下部タブバー表示（`desktop:hidden`）
- 1025px~: サイドバーナビ表示（`hidden desktop:flex`）
- カスタムブレークポイント `desktop` を Tailwind v4 の `@theme` で定義

### アクセシビリティ
- `aria-label="メインナビゲーション"` — ナビランドマーク
- `aria-current="page"` — アクティブタブ
- `aria-hidden="true"` — アイコン（装飾的）
- `focus-visible:ring-2` — キーボードフォーカス可視性

### モバイル対応
- `pb-[env(safe-area-inset-bottom)]` — iPhoneセーフエリア対応
- `viewport-fit: cover` — ルートレイアウトで設定

### 認証ガード
- `(app)/layout.tsx`に`auth()` + `redirect("/login")`を集約
- 各ページからredirectを削除（DRY化）

## Codexレビュー指摘と対応

| # | 重要度 | 指摘内容 | 対応 |
|---|--------|---------|------|
| 1 | High | /expenses, /reviewが404になる | プレースホルダーページ追加 |
| 2 | Medium | aria-current, aria-label不足 | 両コンポーネントに追加 |
| 3 | Medium | focus-visible未設定 | ring-2スタイル追加 |
| 4 | Medium | セーフエリア未考慮 | env(safe-area-inset-bottom) + viewport-fit追加 |
| 5 | Low | 認証ガード重複 | (app)/layout.tsxに集約 |

修正後の再レビューで **LGTM** を取得。

## 将来の課題
- タブレット幅（641~1024px）でのレイアウト最適化検討
- ナビゲーション項目追加時のスクロール対応（5タブ以上の場合）
