# Issue #11: API共通基盤 + プライバシーフィルタリング実装

## 対応日
2026-02-25

## ブランチ
`feature/issue-11-api-foundation` (from `develop`)

## 作成ファイル一覧

### src/lib/privacy/ — プライバシーフィルタリング
| ファイル | 内容 |
|---------|------|
| `types.ts` | ExpenseForPrivacy, FilteredExpense, CategoryTotal 等の型定義 |
| `expense-filter.ts` | filterExpenseForUser, filterExpensesForUser, aggregateCategoryTotals |
| `index.ts` | 再export |

### src/lib/validations/ — Zod共通スキーマ
| ファイル | 内容 |
|---------|------|
| `common.ts` | ErrorCode, apiErrorSchema, apiSuccessSchema |
| `expense.ts` | expenseCreateSchema, expenseUpdateSchema, visibilitySchema |
| `pagination.ts` | paginationSchema, calcPaginationMeta |
| `index.ts` | 再export |

### src/lib/api/ — API共通ユーティリティ
| ファイル | 内容 |
|---------|------|
| `errors.ts` | ApiError クラス |
| `auth.ts` | requireAuth() — セッション検証 + userId/role 抽出 |
| `response.ts` | jsonOk(), jsonError() — 統一レスポンスヘルパー |
| `handler.ts` | withApiHandler() — エラーハンドリングラッパー |
| `index.ts` | 再export |

## 実装詳細

### プライバシーフィルタリング設計
- `filterExpenseForUser`: 1件の支出にvisibilityフィルタを適用
  - 自分の支出: 常に全詳細返却（masked: false）
  - PUBLIC: 全フィールド返却
  - AMOUNT_ONLY: description → 「個人支出」、memo → null に置換
  - CATEGORY_TOTAL: null を返す（個別明細非表示）
- `filterExpensesForUser`: 一覧用バッチフィルタ。items + categoryTotals に分離
- `aggregateCategoryTotals`: CATEGORY_TOTAL の支出をカテゴリ別に集計

### Zodスキーマ設計
- `expenseBaseSchema`（default なし）と `expenseCreateSchema`（default 付き）を分離
- `expenseUpdateSchema` は `expenseBaseSchema.partial()` で PATCH 時の意図しない上書きを防止
- 金額は `z.number().int().positive()` で整数・正数バリデーション

### API共通ユーティリティ設計
- `withApiHandler`: ApiError → 統一エラーレスポンス、ZodError → VALIDATION_ERROR、その他 → INTERNAL_ERROR
- `RouteContext` 型: Next.js 16 の `AppRouteHandlerFnContext` に準拠
- `jsonError`: 本番環境では `details` キーを含めない（セキュリティ対策）

## Codexレビュー指摘と対応

| # | 重要度 | 指摘内容 | 対応 |
|---|--------|---------|------|
| 1 | High | `expenseUpdateSchema.partial()` で default が残り、PATCH時に未指定フィールドが上書きされる | `expenseBaseSchema`（default なし）を分離し、updateSchema はそちらから partial() |
| 2 | Medium | `withApiHandler` の context.params 型が Next 16 と不整合 | `NextRequest` + `Record<string, string \| string[] \| undefined>` に修正 |
| 3 | Low | `jsonError` の details が本番でも返却される情報露出リスク | development 時のみ details を含める条件スプレッドに変更 |

## 将来の課題
- 後続 Issue #12〜#17 でこの共通基盤を使った各APIルートを実装
- CATEGORY_TOTAL の詳細取得API（/expenses/:id）では 404 を返す設計を検討
- テストの追加（filterExpenseForUser のユニットテスト等）
