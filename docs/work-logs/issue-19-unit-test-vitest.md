# Issue #19: isPathActive() の単体テスト追加（Vitest基盤導入）

## 対応日
2026-02-26

## ブランチ
`feature/issue-19-unit-test-vitest`（develop から分岐）

## 作成・変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `vitest.config.ts` | Vitest設定（@/パスエイリアス、environmentMatchGlobs、coverage） |
| `src/components/layout/navigation-utils.test.ts` | isPathActive() の単体テスト（8ケース） |
| `.github/workflows/unit.yml` | CI用ユニットテストワークフロー |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `package.json` | test/test:watch スクリプト追加、vitest関連devDependencies追加 |
| `pnpm-lock.yaml` | 依存関係の更新 |
| `src/components/layout/navigation-utils.ts` | 末尾スラッシュ正規化の追加 |

## 実装詳細

### 1. Vitest基盤導入
- `vitest`, `@vitest/coverage-v8`, `vite-tsconfig-paths` をdevDependenciesに追加
- `vitest.config.ts` で `@/` パスエイリアスを `vite-tsconfig-paths` プラグインで解決
- `.ts` テストは `node` 環境、`.tsx` テストは `jsdom` 環境を `environmentMatchGlobs` で自動切替

### 2. テストケース（8件）
| テスト | 内容 |
|-------|------|
| `/` はホームページのみでアクティブ | `("/", "/")` → true, `("/expenses", "/")` → false |
| 完全一致でアクティブ | `("/expenses", "/expenses")` → true |
| 子パス一致でアクティブ | `("/expenses/123", "/expenses")` → true |
| 部分一致の誤検知防止 | `("/reviewer", "/review")` → false, `("/expenses-summary", "/expenses")` → false |
| 非一致は false | `("/settings", "/review")` → false |
| pathname末尾スラッシュは一致 | `("/expenses/", "/expenses")` → true |
| href末尾スラッシュも正規化で一致 | `("/expenses", "/expenses/")` → true |
| 空文字pathnameは false | `("", "/expenses")` → false |

### 3. isPathActive() の改善
- `normalize()` ヘルパー関数を追加し、ルート以外の末尾スラッシュを除去
- pathname と href の両方を正規化してから比較するよう変更

### 4. CI ワークフロー
- `.github/workflows/unit.yml` を新規作成（e2e.yml とは分離）
- checkout → pnpm setup → install → `pnpm test` のシンプルな構成

## レビュー指摘と対応

### Codex（GPT-5.3）による初回レビュー
| 重要度 | 指摘内容 | 対応 |
|--------|---------|------|
| Medium | `environment: "node"` で `*.test.tsx` を include に含めると将来のReactコンポーネントテストで失敗する | `environmentMatchGlobs` で `.test.tsx` は `jsdom` を自動適用するよう設定 |
| Low | 末尾スラッシュ付き `href` を不一致とすると将来的に事故りやすい | `normalize()` 関数を追加し、末尾スラッシュを正規化して比較 |

### Codex 再レビュー結果
- 指摘事項なし、承認済み
- 全8テスト成功を確認

## 将来の課題
- Reactコンポーネントの単体テスト追加時に `jsdom` 環境の動作検証が必要
- カバレッジ閾値の設定（現在は未設定）
- テスト対象の拡大（lib/配下のビジネスロジック等）
