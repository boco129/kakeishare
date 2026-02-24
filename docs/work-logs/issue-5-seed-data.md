# Issue #5: シードデータ実装（ユーザー・カテゴリ・支出・予算・分割払い）

- **対応日**: 2026-02-24
- **ブランチ**: `feature/issue-5-seed-data`
- **ステータス**: 完了（developマージ済み、Issue クローズ済み）

## 対応内容

### 作成・変更ファイル

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `prisma/seed.ts` | 新規作成 | 全6テーブルのシードデータ投入スクリプト |
| `package.json` | 変更 | `tsx`, `@prisma/adapter-better-sqlite3`, `better-sqlite3` 追加 + seed設定 |
| `prisma.config.ts` | 変更 | Prisma v7 seed設定追加 |
| `pnpm-lock.yaml` | 変更 | 依存関係更新 |

### 実装詳細

#### PrismaClient 初期化（Prisma v7 対応）

```ts
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
})
const prisma = new PrismaClient({ adapter })
```

- `src/lib/db.ts` では `undefined as unknown as ...` のワークアラウンドを使用しているが、seed スクリプトでは実行時にも弾かれた
- `@prisma/adapter-better-sqlite3` を導入し、正規の adapter 方式で初期化

#### 冪等性の確保

```ts
await prisma.$transaction(async (tx) => {
  // 子テーブルから削除（外部キー制約順）
  await tx.installment.deleteMany()
  await tx.expense.deleteMany()
  await tx.csvImport.deleteMany()
  await tx.budget.deleteMany()
  await tx.category.deleteMany()
  await tx.user.deleteMany()

  // createMany で一括投入
  // ...
})
```

- `deleteMany → createMany` パターンを `$transaction` で包んで原子性を確保
- 再実行しても件数が変わらないことを確認済み

#### 型安全性

- Prisma 生成 enum（`Visibility`, `ExpenseSource`, `Role`）を使用
- `RawExpense` 型を定義して支出データの型チェックを実施

#### 日付のタイムゾーン固定

```ts
const d = (ymd: string) => new Date(`${ymd}T00:00:00+09:00`)
const dt = (isoLocal: string) => new Date(`${isoLocal}+09:00`)
```

- JST（+09:00）を明示し、実行環境によるタイムゾーン差異を回避

#### CsvImport の fileHash

- `@@unique([userId, fileHash])` 制約を満たすため、決定的で一意なダミー値を使用
- 例: `seed:user_wife:epos:2026-01`

### 投入データサマリー

| テーブル | 件数 | 備考 |
|---------|------|------|
| users | 2 | 太郎(ADMIN) + 花子(MEMBER) |
| categories | 15 | default_visibility付き |
| budgets | 28 | 2026年1月・2月（各14カテゴリ） |
| expenses | 44 | 妻18件 + 夫26件 |
| installments | 3 | ZARA, Apple, ニトリ |
| csv_imports | 3 | エポス, MUFG JCB, MUFG VISA |

#### テストシナリオカバレッジ

- 予算超過（全体で6.7%超過）
- 未確認支出（5件）
- 立替払い（居酒屋、自己負担額付き）
- 返品/マイナス金額（Amazon -¥1,200）
- 分割払い（3件）
- CATEGORY_TOTAL 表示（個人娯楽）
- AMOUNT_ONLY 表示（交際費、衣服・美容）
- 固定費（家賃、光熱費、通信費）
- 同一店舗複数回購入（Amazon）

### seed設定

Prisma v7 の `prisma.config.ts` と Issue 仕様の `package.json` の両方に設定を配置:

```ts
// prisma.config.ts
migrations: {
  seed: "tsx prisma/seed.ts",
}
```

```json
// package.json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

## Codex レビュー（3回実施）

### 第1回: 設計相談

| # | 質問 | Codex回答 |
|---|------|-----------|
| 1 | PrismaClient 初期化方法 | `@prisma/adapter-better-sqlite3` が最も正攻法 |
| 2 | upsert vs deleteMany+createMany | seed用途では `deleteMany → createMany` in `$transaction` が安定 |
| 3 | Installment-Expense 紐付け | 現スキーマにFKなし、将来的に `expenseId` 追加を推奨 |
| 4 | CsvImport の fileHash | 決定的で一意なダミー値を入れるべき |
| 5 | seed設定の配置場所 | Prisma v7 では `prisma.config.ts` が正規 |

### 第2回: コードレビュー

| # | 重要度 | 指摘内容 | 対応 |
|---|-------|---------|------|
| 1 | 高 | スキーマに `expense_id`/`status`/`card_source` が未実装 | スキーマ変更は別issue範囲。seed側は現スキーマに合致 |
| 2 | 中 | 型安全性が弱い（文字列リテラル依存） | Prisma 生成 enum に置き換え |
| 3 | 低 | 日付がタイムゾーン依存 | JST 固定（+09:00）に変更 |
| 4 | 低 | seed設定の二重管理 | issue仕様通りなので維持 |
| - | - | データ件数/金額/visibility | **定義書と一致**を確認 |

### 第3回: 再レビュー

- **判定**: LGTM（承認）
- 前回指摘の3点が全て適切に反映されていることを確認
- 軽微な残存課題: `dt()` のタイムゾーン保証 → 対応済み

## 将来の課題

- Installment と Expense の紐付け（`expenseId` カラム追加）は別issueで対応
- CsvImport に `status`（COMPLETED/FAILED）、`cardSource`（enum）の追加検討
- Prisma v7 の型問題が解決されたら `db.ts` 側も adapter 方式に統一する選択肢あり
