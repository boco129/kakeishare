# Issue #37: 予算API CRUD（Budget API）

## 対応日
2026-02-28

## ブランチ
`feature/issue-37-budget-api` → `develop`

## 作成・変更ファイル

| ファイル | 内容 |
|---------|------|
| `src/app/api/budgets/route.ts` | GET（一覧+実績額）/ POST（upsert、ADMINのみ） |
| `src/app/api/budgets/[id]/route.ts` | PATCH（金額更新）/ DELETE（ADMINのみ） |
| `src/lib/validations/budget.ts` | budgetPatchSchema追加、budgetListQuerySchema追加、categoryIdをmin(1)に変更 |
| `src/lib/validations/index.ts` | バレルエクスポート更新 |
| `prisma/migrations/20260228100000_add_budget_null_category_unique/migration.sql` | 部分ユニーク制約 |
| `e2e/budget-api.spec.ts` | E2Eテスト（認可制御・CRUD・upsert・バリデーション） |

## 実装詳細

### API エンドポイント

| メソッド | パス | 権限 | 概要 |
|---------|------|------|------|
| GET | `/api/budgets?yearMonth=YYYY-MM` | 認証済み全ユーザー | 予算一覧+実績額 |
| POST | `/api/budgets` | ADMINのみ | 予算作成/更新（upsert） |
| PATCH | `/api/budgets/:id` | ADMINのみ | 金額更新 |
| DELETE | `/api/budgets/:id` | ADMINのみ | 予算削除 |

### 設計方針

- **GETの実績額**: 全体予算(categoryId=null)はtotalSpent、カテゴリ予算はカテゴリ別実績
- **POSTのupsert**: カテゴリ予算はPrisma upsert、全体予算はtransaction内findFirst→update/create
- **PATCHスキーマ**: amountのみ（yearMonth/categoryIdは変更不可）
- **null category競合回避**: 部分ユニーク制約 + P2002エラーフォールバック

### E2Eテスト

- 認可制御: 未認証→401、MEMBER→403（変更系のみ）、MEMBER→200（GET）
- CRUD: カテゴリ予算の作成→取得→更新→削除、全体予算の作成と取得
- Upsert: 同一キー重複POST→IDが維持・金額のみ更新、null category重複防止
- バリデーション: 不正yearMonth、負数amount、存在しないcategoryId、存在しないID

## Codexレビュー指摘と対応

### 第1ラウンド
1. **High**: categoryIdのcuid()バリデーションがseed形式と不一致 → min(1)に変更
2. **Medium**: null categoryの競合回避不十分 → 部分ユニーク制約追加+P2002フォールバック
3. **Medium**: テストのcategoryIDが400になる問題 → 正しい形式の未存在IDに修正
4. **Low**: JSONパースエラーで500 → try-catchで400に正規化

### 第2ラウンド
1. **Medium**: P2002限定catchに変更（全例外catchは危険）
2. **Low**: PATCHテストのID→実在budgetIDに変更

### 第3ラウンド
- 承認（問題なし）

## 将来の課題

- 予算管理UI（Issue #42）との連携
- 予算超過アラート機能
- 月次予算のコピー機能（前月予算をベースに翌月作成）
