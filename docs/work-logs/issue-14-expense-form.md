# Issue #14: 支出登録フォーム（手入力・公開レベル選択・立替対応）

## 対応日
2026-02-25

## ブランチ
`feature/issue-14-expense-form` (from `develop`)

## 作成・変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `src/components/expenses/expense-form.tsx` | 支出登録フォームコンポーネント（RHF + zodResolver） |
| `src/components/expenses/expenses-page-client.tsx` | 支出ページクライアントコンポーネント（ダイアログ統合） |
| `src/components/ui/checkbox.tsx` | shadcn/ui Checkbox |
| `src/components/ui/form.tsx` | shadcn/ui Form（RHF統合） |
| `src/components/ui/radio-group.tsx` | shadcn/ui RadioGroup |
| `src/components/ui/sonner.tsx` | shadcn/ui Sonner（トースト） |
| `src/components/ui/textarea.tsx` | shadcn/ui Textarea |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `src/app/(app)/expenses/page.tsx` | プレースホルダー → ExpensesPageClient呼び出しに変更 |
| `src/app/layout.tsx` | Toaster（sonner）コンポーネント追加 |
| `package.json` | react-hook-form, @hookform/resolvers, sonner 追加 |
| `pnpm-lock.yaml` | ロックファイル更新 |

## 実装詳細

### フォーム状態管理
- `react-hook-form` + `@hookform/resolvers/zod` を採用
- フォーム用Zodスキーマはクライアント側で定義（`z.number()` を使用し型安全性を確保）
- `z.infer<typeof formSchema>` で型を自動導出

### 入力フィールド
- 日付: `input[type="date"]`（モバイルファースト、OSネイティブUI活用）
- 金額: `input[type="number"]` + `inputMode="numeric"` + `valueAsNumber` 変換
- カテゴリ: shadcn/ui Select（APIからカテゴリ一覧を取得）
- 説明/店舗名: テキスト入力
- メモ: Textarea（任意）
- 公開レベル: RadioGroup（3択を常時表示、色付きインジケーター付き）
- 立替チェック: Checkbox（チェック時のみ自己負担額フィールド表示）
- 自己負担額: `input[type="number"]`（立替時のみ）

### カテゴリ連動
- カテゴリ選択時に `userVisibility`（ユーザー別設定）を優先してvisibilityを自動セット
- `userVisibility` が未設定の場合はAPIが `defaultVisibility` をフォールバックとして返す

### エラーハンドリング
- Zodバリデーション: フォーム送信時にクライアント側でバリデーション
- API呼び出し: try-catch でネットワークエラーに対応、`res.json()` も個別try-catch
- カテゴリ取得: AbortController によるクリーンアップ + エラートースト

### UI/UX
- ダイアログ内フォーム（一覧のコンテキストを維持）
- `max-h-[90vh] overflow-y-auto` でモバイル対応
- 登録成功時にsonnerトースト通知 + ページリフレッシュ
- モバイルファーストのレスポンシブデザイン（`grid-cols-1 sm:grid-cols-2`）

## レビュー指摘と対応

Codex（GPT-5.3）によるコードレビューで5点の指摘を受け、すべて修正後にLGTMを取得。

| # | 重要度 | 指摘内容 | 対応 |
|---|--------|---------|------|
| 1 | High | `userVisibility` を反映していない | Category型にuserVisibility追加、setValue時にuserVisibilityを優先 |
| 2 | High | API呼び出しのエラーハンドリング不足 | fetch全体のtry-catch + res.json()個別try-catch追加 |
| 3 | Medium | カテゴリ取得にAbortController/例外処理なし | AbortController + クリーンアップ + エラートースト追加 |
| 4 | Medium | チェックボックスのラベル関連付け不足 | id/htmlFor/cursor-pointer追加 |
| 5 | Low | Visibility定義の重複 | visibilitySchemaをlib/validations/expense.tsからimportして導出 |

## 将来の課題
- 支出一覧表示の実装（Issue #15以降）
- 支出編集フォーム（既存データのプリフィル）
- ThemeProvider導入時にsonner Toasterのテーマ連携確認が必要
