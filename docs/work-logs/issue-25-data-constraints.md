# Issue #25: データ不変条件の制約強化（CHECK + 入力バリデーション）

## 対応日
2026-02-28

## ブランチ
`feature/issue-25-data-constraints`（develop から分岐）

## 作成・変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `src/lib/validations/year-month.ts` | YYYY-MM形式の共通バリデーションスキーマ |
| `src/lib/validations/budget.ts` | 予算バリデーション（yearMonth形式, amount非負） |
| `src/lib/validations/installment.ts` | 分割払いバリデーション（金額非負, 回数正数, 相関制約） |
| `prisma/migrations/20260228000000_add_check_constraints/migration.sql` | DB CHECK制約マイグレーション |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `src/lib/validations/expense.ts` | amount: `.positive()` → `.refine(v !== 0)`（返品対応）、yearMonthSchema共通化 |
| `src/lib/validations/csv-import.ts` | yearMonthSchemaを共通モジュールから再エクスポート |
| `src/lib/validations/index.ts` | budget, installment, yearMonthSchemaのエクスポート追加 |

## 実装詳細

### 1. DB CHECK制約（SQLite）
テーブル再作成方式で以下の制約を追加:

| テーブル | 制約 |
|---------|------|
| expenses | `amount <> 0`（返品の負数を許容、ゼロのみ禁止） |
| budgets | `amount >= 0`, `yearMonth` YYYY-MM形式（GLOB + substr月範囲検証） |
| installments | `totalMonths > 0`, `remainingMonths >= 0`, `remainingMonths <= totalMonths`, `totalAmount >= 0`, `monthlyAmount >= 0`, `fee >= 0` |
| csv_imports | `recordCount >= 0`, `unconfirmedCount >= 0`, `unconfirmedCount <= recordCount`, `yearMonth` YYYY-MM形式 |

### 2. Zodバリデーション
- **yearMonthSchema**: csv-import.tsから共通モジュール（year-month.ts）に抽出
- **budgetCreateSchema/budgetUpdateSchema**: yearMonth形式 + amount非負
- **installmentCreateSchema**: 金額非負 + 回数正数 + `remainingMonths <= totalMonths` refine
- **installmentUpdateSchema**: 両フィールド指定時のみ相関制約（superRefine）
- **expense amount**: `.positive()` → `.refine(v !== 0)` に変更（返品対応）

### 3. Preflight SQL
マイグレーションSQLコメントに全CHECK制約の事前検証用SQLを記載（本番適用前の運用手順）

## Codexレビュー指摘と対応

| 回 | 重要度 | 指摘 | 対応 |
|----|--------|------|------|
| 1回目 | High | Preflight SQLでの違反データ事前検出が必要 | マイグレーションSQLにpreflight SQLコメント追加 |
| 1回目 | Medium | installmentUpdateSchemaに相関制約が欠落 | superRefineで両方指定時のremainingMonths <= totalMonths検証追加 |
| 2回目 | High | Preflightがinstallments金額3項目とcsv_imports.yearMonthを網羅していない | 不足分のチェックを追加 |
| 3回目 | - | 承認 | - |

## 将来の課題
- PostgreSQL対応時にCHECK制約の構文変更が必要（正規表現 `~` 演算子使用）
- Budget/Installment APIルート実装時にZodスキーマを適用する
- 片側更新時（remainingMonthsのみ更新）の相関制約は既存値とのマージ後検証が必要
