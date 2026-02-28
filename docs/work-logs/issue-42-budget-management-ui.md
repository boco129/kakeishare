# Issue #42 月次予算管理UI実装

## 対応日
2026-02-28

## ブランチ
`feature/issue-42-budget-management-ui`（develop から分岐）

## 作成・変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `src/app/(app)/settings/budgets/page.tsx` | 予算設定ページ（Server Component） |
| `src/components/settings/budget-manager.tsx` | 予算管理UIコンポーネント（Client Component） |
| `src/lib/api/budgets.ts` | クライアント側API呼び出し関数 |
| `src/app/api/budgets/copy/route.ts` | 前月予算コピーAPI |

### 変更
| ファイル | 内容 |
|---------|------|
| `src/app/(app)/settings/page.tsx` | 予算設定へのリンクカード追加 |
| `src/app/api/budgets/route.ts` | GET レスポンスに meta（spentByCategory, totalSpent）追加 |

## 実装詳細

### 1. 予算設定ページ（Server Component）
- `settings/budgets/page.tsx` でカテゴリ一覧・当月予算・前月実績をSSR取得
- `isAdmin` 判定でADMINのみ編集可能

### 2. BudgetManager（Client Component）
- 月切り替え（前月/翌月ボタン）
- 全体予算入力 + 先月実績表示
- カテゴリ別予算テーブル（3列: カテゴリ名 / 予算Input / 先月実績）
- 実績 > 予算の場合は赤字表示
- カテゴリ合計の自動集計
- 一括保存（POST/PATCH/DELETE の Promise.all）
- ADMIN のみ編集・保存可能（MEMBER は閲覧のみ）

### 3. 前月予算コピー機能
- `POST /api/budgets/copy` — ADMIN のみ実行可能
- トランザクション内で前月予算を取得 → 当月予算を削除 → 前月分をコピー作成
- 確認ダイアログ付き（上書き警告）

### 4. GET /api/budgets レスポンス拡張
- `meta.spentByCategory` — カテゴリ別支出実績（予算未設定カテゴリも含む）
- `meta.totalSpent` — 全体支出合計
- 月切り替え時の前月実績表示に利用

### 5. クライアント側API関数
- `listBudgets(yearMonth)` — 予算一覧取得（meta付き）
- `upsertBudget(body)` — 予算作成/更新
- `patchBudget(id, amount)` — 金額更新
- `deleteBudget(id)` — 予算削除
- `copyBudgets(targetYearMonth)` — 前月予算コピー

## Codexレビュー指摘と対応

### 第1回レビュー（3点指摘）
1. **[High] 前月実績データの欠損** — `loadMonth` で `listBudgets(prevYm)` を使うと予算未設定カテゴリの実績が取れない
   → GET API に `meta.spentByCategory` を追加し、予算未設定カテゴリの実績も返すよう修正
2. **[Medium] 赤字条件の不備** — `prevSpent > amount && amount > 0` だと予算0円で実績ありの場合に赤字にならない
   → `&& amount > 0` を削除
3. **[Medium/UX] コピー確認なし** — 前月コピーボタンが確認なしで即実行される
   → Dialog による確認ダイアログを追加

### 第2回レビュー
- 全指摘事項の解消を確認、最終承認

## 将来の課題
- 予算達成率のグラフ表示（ダッシュボード連携）
- 予算超過時の通知機能
- 年間予算の一括設定機能
