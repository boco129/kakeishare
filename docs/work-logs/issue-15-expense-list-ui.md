# Issue #15: 支出一覧・フィルタリング・編集削除UI

## 対応日
2026-02-25

## ブランチ
`feature/issue-15-expense-list-ui` (from `develop`)

## 作成・変更ファイル一覧

### 新規作成

| ファイル | 内容 |
|---------|------|
| `src/components/expenses/use-expenses.ts` | useExpenses hook — フィルタ・ページネーション・データ取得を一括管理 |
| `src/components/expenses/expense-filters.tsx` | フィルタバー — 月選択、ユーザー、カテゴリ、ソート |
| `src/components/expenses/expense-list.tsx` | 支出一覧 — 日付別グルーピング表示 |
| `src/components/expenses/expense-card.tsx` | 個別支出カード — バッジ表示、編集/削除ボタン |
| `src/components/expenses/expense-summary.tsx` | 月次サマリー — 合計金額、ユーザー別小計、未確認件数 |
| `src/components/expenses/category-total-section.tsx` | CATEGORY_TOTAL集計 — 非公開カテゴリの合計表示 |
| `src/components/expenses/delete-confirm-dialog.tsx` | 削除確認ダイアログ |

### 変更

| ファイル | 変更内容 |
|---------|---------|
| `src/components/expenses/expenses-page-client.tsx` | 全面改修: フィルタ・一覧・サマリー・編集/削除ダイアログを統合 |
| `src/components/expenses/expense-form.tsx` | mode + initialValues でedit対応、編集時のvisibility自動上書き抑制 |
| `src/app/(app)/expenses/page.tsx` | currentUserId・usersをクライアントに渡す、認証ガード追加 |
| `src/app/api/expenses/route.ts` | sortBy/sortOrderパラメータ追加、フィルタ後ソート |
| `src/lib/privacy/types.ts` | ExpenseForPrivacy型にisSubstitute, actualAmount, confirmed, source, category追加 |
| `src/lib/privacy/expense-filter.ts` | 新フィールド対応、AMOUNT_ONLYで立替情報マスク |
| `src/lib/validations/expense.ts` | sortBySchema, sortOrderSchema追加 |

## 実装詳細

### コンポーネント設計
- **Container + Presentational パターン**: `ExpensesPageClient`が状態管理・モーダル制御を担当し、各子コンポーネントは表示に専念
- **useExpenses hook**: AbortController + reqIdRefによるリクエスト競合防止、フィルタ変更時の自動再取得
- **Load more方式**: シンプルなページネーション（将来的に無限スクロールへ拡張可能）

### ExpenseForm編集対応
- `mode="create" | "edit"` と `initialValues` propsで新規/編集を共通化
- `isEditInitialized` refで、編集モード初回のカテゴリ読込時にvisibilityが上書きされるのを防止
- submit先のURL・HTTPメソッドをmodeで分岐（POST/PATCH）

### プライバシー対応
- AMOUNT_ONLY: description→「個人支出」、memo→null、isSubstitute→false、actualAmount→null
- CATEGORY_TOTAL: 個別明細非表示、カテゴリ別集計のみ表示
- 自分の支出は常に全詳細表示、編集/削除ボタンは自分の支出のみ表示

## Codexレビュー指摘と対応

| # | 重要度 | 指摘内容 | 対応 |
|---|--------|---------|------|
| 1 | High | AMOUNT_ONLYで立替情報（isSubstitute, actualAmount）が漏れる | expense-filter.tsでfalse/nullにマスク |
| 2 | High | useExpensesでAbort時にloadingが誤ってfalseになる競合 | reqIdRefパターンで解決 |
| 3 | Medium | APIレスポンスの型安全性が不十分 | 小規模アプリのため将来課題としてスキップ |
| 4 | Medium | 全件取得→フィルタのスケーラビリティ | 月単位フィルタで数百件規模のためスキップ |
| 5 | Medium | 認証チェック前にDB操作される可能性 | page.tsxにredirectガード追加 |
| 6 | Low | アイコンボタンにaria-labelがない | aria-label="支出を編集/削除"を追加 |
| 7 | Low | 集計計算の再計算コストとkeyの安定性 | useMemo導入、key={ut.id}に変更 |

## 将来の課題

- APIレスポンスのZodバリデーション（型安全性向上）
- DB側でのプライバシーフィルタリング（スケーラビリティ向上）
- 無限スクロール対応
- 未確認フィルタトグル
- CSV取込ボタンの実装（Phase 2）
