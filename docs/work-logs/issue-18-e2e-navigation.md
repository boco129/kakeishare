# Issue #18: ナビゲーション表示のE2Eテスト追加

## 対応日
2026-02-25

## ブランチ
`feature/issue-18-e2e-navigation` (from `develop`)

## 作成ファイル
| ファイル | 内容 |
|---------|------|
| `playwright.config.ts` | Playwright設定（mobile/desktop/unauth projects、storageState認証） |
| `e2e/auth.setup.ts` | 認証セットアップ（UIログイン→storageState保存） |
| `e2e/navigation.spec.ts` | ナビゲーションE2E（表示切替・aria-current・遷移） |
| `e2e/login-navigation.spec.ts` | ログイン画面ナビ非表示テスト |
| `e2e/auth-redirect.spec.ts` | ルート保護リダイレクトテスト |
| `.github/workflows/e2e.yml` | GitHub Actions CI設定 |

## 変更ファイル
| ファイル | 変更内容 |
|---------|---------|
| `package.json` | `e2e`, `e2e:ui` スクリプト追加、`@playwright/test` devDependency追加 |
| `.gitignore` | playwright-report/, blob-report/, test-results/, e2e/.auth/ 追加 |
| `src/components/layout/sidebar-nav.tsx` | `data-testid="sidebar-nav"` 追加 |
| `src/components/layout/bottom-tab-bar.tsx` | `data-testid="bottom-tab-nav"` 追加 |

## 実装詳細

### テスト構成
- **Playwright projects**: setup（認証）、mobile（1024px）、desktop（1025px）、unauth（未認証）
- **認証方式**: storageState（UIログイン1回→Cookie保存→再利用）
- **ローカル実行**: `pnpm dev` で開発サーバー起動
- **CI実行**: `pnpm build && pnpm start` で本番モード

### テストケース一覧（23テスト + 17スキップ = 40テスト）
| テスト | project | 内容 |
|--------|---------|------|
| レスポンシブ表示切替 | mobile | 1024px: 下部タブバー表示、サイドバー非表示 |
| レスポンシブ表示切替 | desktop | 1025px: サイドバー表示、下部タブバー非表示 |
| aria-current | mobile/desktop | 各ページで正しいタブにaria-current="page"付与 |
| ナビ遷移 | mobile/desktop | 各リンク押下で想定URLに遷移 |
| ナビ非表示 | unauth | /loginでメインナビゲーション非表示 |
| ルート保護 | unauth | 未認証→/loginリダイレクト |
| ルート保護 | mobile/desktop | 認証済みで/login→/リダイレクト |

### CI設定
- Ubuntu latest、Node 20、pnpm 10
- DB: SQLite（e2e専用）、Chromiumのみ
- `AUTH_SECRET`はrun_idベースで動的生成
- テストレポートをartifactとしてアップロード

## Codexレビュー指摘と対応

| # | 重要度 | 指摘 | 対応 |
|---|--------|------|------|
| 1 | Medium | リンク遷移テストがナビ領域にスコープされていない | `visibleNav()`ヘルパーでproject名に基づきdata-testidでスコープ |
| 2 | Low | 認証情報ハードコード | `process.env.E2E_ADMIN_EMAIL/PASSWORD`にフォールバック付きで変更 |
| 3 | Low | CIのAUTH_SECRET固定 | `github.run_id-github.run_attempt-e2e`に変更 |
| 4 | 追加 | ルート保護リダイレクトテスト未実装 | `e2e/auth-redirect.spec.ts`を新規追加 |

## 技術的注意点

### Next.js 16 + Turbopack のEdge Runtime問題
- `next start`（本番モード）ではEdge Runtimeのmiddlewareが`.env`ファイルからのAUTH_SECRETを参照できない
- ローカルE2Eでは`pnpm dev`を使用（.envを自動読み込み）
- CIではGitHub Actionsのenvでプロセスに直接渡すため問題なし

## 将来の課題
- `@axe-core/playwright` によるナビ領域のa11yチェック追加検討
- テストブラウザの拡張（Firefox, WebKit）
- Next.js のTurbopack Edge Runtime env var問題の追跡
