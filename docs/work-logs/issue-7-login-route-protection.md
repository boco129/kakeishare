# Issue #7: ログイン画面 + ルート保護 + ログアウト

## 対応日
2026-02-24

## ブランチ
`feature/issue-7-login-route-protection`

## 作成・変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `middleware.ts` | ルート保護ミドルウェア（Edge Runtime対応、getToken使用） |
| `src/app/login/page.tsx` | ログインページ（Server Component） |
| `src/app/login/actions.ts` | ログインServer Action（useActionState対応） |
| `src/app/login/_components/login-form.tsx` | ログインフォーム（Client Component） |
| `src/app/settings/page.tsx` | 設定ページ（アカウント情報 + ログアウト） |
| `src/components/layout/logout-button.tsx` | ログアウトボタン（Server Action） |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `src/auth.ts` | NextResponse import 削除（middleware分離のため） |
| `src/lib/db.ts` | Prisma v7 adapter対応（PrismaBetterSqlite3使用） |
| `src/app/page.tsx` | ダッシュボードページに認証チェック追加 |
| `src/app/layout.tsx` | メタデータ・lang属性を日本語化 |

## 実装詳細

### 1. ログインページ
- **Server Action + useActionState** パターンを採用（Codex推奨）
- SessionProviderは不要（Server Componentsでauth()を直接使用）
- shadcn/ui の Card, Input, Button, Label を使用
- モバイルファーストのレスポンシブデザイン
- カケイシェアロゴ（Homeアイコン）付き

### 2. ルート保護（middleware.ts）
- Edge Runtimeで動作するため、Prismaではなく`getToken`（next-auth/jwt）を使用
- 否定パターンmatcherで公開リソース以外を基本保護
  - `/((?!api|_next/static|_next/image|favicon\\.ico).*)`
- callbackUrl にpathname + searchを保持（hashはHTTPリクエストに載らないため対象外）

### 3. ログアウト
- Server Action で `signOut({ redirectTo: "/login" })` を実行
- 設定ページ下部に配置

### 4. Prisma v7 adapter修正
- `prisma-client` ジェネレーター（client engine）では adapter が必須
- `@prisma/adapter-better-sqlite3` を使用して初期化

## Codex レビュー指摘と対応

### 初回レビュー（5件）
| # | 重要度 | 指摘 | 対応 |
|---|--------|------|------|
| 1 | High | `callbackUrl` の `//evil.com` でオープンリダイレクト | `safeRedirectPath()` で `//` を拒否 |
| 2 | Medium | matcherが列挙型で保護漏れリスク | 否定パターンに変更 |
| 3 | Medium | callbackUrlにquery/hashが保持されない | pathname+searchを保持（hashは対象外） |
| 4 | Low | role未定義時に「メンバー」と誤表示 | 3分岐に変更（管理者/メンバー/不明） |
| 5 | Low | ログイン失敗以外の例外で500エラー | 汎用エラーメッセージ返却 |

### 再レビュー（2件追加）
| # | 重要度 | 指摘 | 対応 |
|---|--------|------|------|
| 1 | Medium | hash保持は実質未達（サーバー側で取得不可） | hashを削除 |
| 2 | Low | NEXT_REDIRECT判定が文字列依存 | `isRedirectError()` に変更 |

## 将来の課題
- レート制限（Credentials総当たり対策）
- ログインページのアクセシビリティ改善
- パスワードリセット機能
