# Issue #13: 支出 CRUD API（立替・自己負担額対応）

## 対応日
2026-02-25

## ブランチ
`feature/issue-13-expense-crud` (from `develop`)

## 作成・変更ファイル一覧

### 新規作成

| ファイル | 内容 |
|---------|------|
| `src/lib/expenses/visibility.ts` | resolveVisibility — visibility自動解決ロジック |
| `src/lib/expenses/index.ts` | 再エクスポート |
| `src/app/api/expenses/route.ts` | GET（一覧取得）/ POST（新規作成）|
| `src/app/api/expenses/[id]/route.ts` | GET（詳細）/ PATCH（更新）/ DELETE（削除）|

### 変更

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/validations/expense.ts` | expenseCreateSchemaのvisibilityをoptional()に変更、expenseListQuerySchema追加、yearMonth正規表現厳密化 |

## 実装詳細

### API エンドポイント

| メソッド | パス | 機能 |
|---------|------|------|
| GET | `/api/expenses` | 支出一覧（yearMonth/categoryId/userIdフィルター + ページネーション + プライバシーフィルター） |
| POST | `/api/expenses` | 支出登録（source: MANUAL、visibility自動解決） |
| GET | `/api/expenses/[id]` | 支出詳細取得（プライバシーフィルター適用） |
| PATCH | `/api/expenses/[id]` | 支出更新（所有者のみ） |
| DELETE | `/api/expenses/[id]` | 支出削除（所有者のみ） |

### visibility 自動解決の優先順位
1. 明示指定（リクエストで visibility を指定した場合）
2. CategoryVisibilitySetting（ユーザー別オーバーライド）
3. Category.defaultVisibility
4. PUBLIC（カテゴリ未指定時のフォールバック）

### GET一覧レスポンス構造
```json
{
  "ok": true,
  "data": {
    "items": [...],
    "categoryTotals": [{ "categoryId": "...", "totalAmount": 25000, "count": 3 }]
  },
  "meta": { "page": 1, "limit": 20, "totalCount": 42, "totalPages": 3 }
}
```

### 立替・自己負担額
- `isSubstitute: true` の場合のみ `actualAmount` を保存
- `actualAmount` は `amount` 以下であることをバリデーション

## Codexレビュー指摘と対応

| # | 重要度 | 指摘内容 | 対応 |
|---|--------|---------|------|
| 1 | High | 不正JSONで500になる | POST/PATCHにtry/catchでJSON parse エラーを400に変換 |
| 2 | Medium | yearMonthが不正な月（2026-99等）を許容 | 正規表現を `^\d{4}-(0[1-9]\|1[0-2])$` に厳密化 |
| 3 | Medium | actualAmount > amount の整合チェック不足 | POST/PATCH両方にバリデーション追加 |
| 4 | Low | extractIdのnon-null assertionで500化リスク | オプショナルチェーン `context.params?.id` に変更 |

再レビューで **LGTM** を取得。

## 将来の課題
- `parseJsonOr400` をAPI共通基盤（`src/lib/api/`）に共通関数として抽出
- APIテスト追加（不正JSON、yearMonth不正値、actualAmount > amount のケース）
