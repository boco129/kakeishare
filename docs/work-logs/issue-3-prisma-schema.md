# Issue #3: Prisma 初期設定 + 全テーブル schema 定義

- **対応日**: 2026-02-24
- **ブランチ**: `feature/issue-3-prisma-schema`
- **ステータス**: 完了（developマージ済み、Issue クローズ済み）

## 対応内容

### 作成・変更ファイル

| ファイル | 変更種別 | 内容 |
|---------|---------|------|
| `prisma/schema.prisma` | 新規 | 6テーブル + 3 enum 全定義 |
| `prisma/migrations/init/migration.sql` | 新規 | 初期マイグレーションSQL |
| `prisma/migrations/migration_lock.toml` | 新規 | マイグレーションロック（SQLite） |
| `prisma.config.ts` | 新規 | Prisma v7 設定（datasource URL、seed設定） |
| `src/lib/db.ts` | 新規 | Prisma Client シングルトン |
| `.env` | 変更 | `DATABASE_URL="file:./prisma/dev.db"` 設定 |
| `.gitignore` | 変更 | `prisma/dev.db` / `prisma/dev.db-journal` 除外追加 |
| `package.json` | 変更 | `postinstall: prisma generate` 追加、tsx・better-sqlite3 等の依存追加 |

### enum 定義

| enum | 値 | 用途 |
|------|-----|------|
| `Role` | ADMIN / MEMBER | ユーザー権限（夫=ADMIN / 妻=MEMBER） |
| `Visibility` | PUBLIC / AMOUNT_ONLY / CATEGORY_TOTAL | プライバシー3段階 |
| `ExpenseSource` | CSV_IMPORT / MANUAL | 支出データの取り込み元 |

### テーブル定義

| モデル | 主要カラム | 備考 |
|--------|-----------|------|
| `User` | id, name, email(unique), password, role | `@@map("users")` |
| `Category` | id, name, icon, isFixedCost, defaultVisibility, sortOrder | `@@map("categories")` |
| `Expense` | id, userId, date, amount(Int), description, categoryId?, visibility, isSubstitute, actualAmount?, source, csvImportId?, aiCategorized, confirmed, memo? | `@@map("expenses")` |
| `Budget` | id, yearMonth, categoryId?, amount | `@@map("budgets")`、categoryId null=全体予算 |
| `Installment` | id, userId, description, totalAmount, monthlyAmount, totalMonths, remainingMonths, startDate, visibility, fee | `@@map("installments")` |
| `CsvImport` | id, userId, importedById, cardName, yearMonth, importedAt, recordCount, unconfirmedCount, fileHash | `@@map("csv_imports")` |

### リレーション

- `User` ↔ `Expense`: 1対多（userId）
- `User` ↔ `Installment`: 1対多（userId）
- `User` ↔ `CsvImport`: 1対多 × 2（userId=カード所有者, importedById=取り込み実行者）
- `Category` ↔ `Expense`: 1対多（categoryId、nullable）
- `Category` ↔ `Budget`: 1対多（categoryId、nullable）
- `CsvImport` ↔ `Expense`: 1対多（csvImportId）

### インデックス・制約

| テーブル | インデックス/制約 |
|---------|-----------------|
| `users` | email UNIQUE |
| `expenses` | userId, userId+date（複合）, date, categoryId, csvImportId |
| `budgets` | yearMonth+categoryId UNIQUE |
| `installments` | userId |
| `csv_imports` | userId, importedById, userId+fileHash UNIQUE |

### 設計判断

| 判断事項 | 決定 | 理由 |
|---------|------|------|
| ID戦略 | `cuid()` | Issue #3 指定。seedでは固定文字列ID使用 |
| Role enum | ADMIN / MEMBER | 要件書のHUSBAND/WIFEより汎用的。UI文言で夫/妻表現 |
| 金額型 | `Int`（円単位） | CLAUDE.md ルール準拠。floatは使わない |
| yearMonth型 | `String`（"YYYY-MM"） | Issue #3 指定。バリデーションはアプリ層で担保 |
| Expense.categoryId | nullable | CSV取り込み時の未分類状態を許容 |
| Budget.categoryId | nullable | 要件定義書の「nullなら全体予算」に対応 |
| Installment.fee | `fee`（Int, default 0） | 分割手数料。Codexの命名レビューを反映 |
| CsvImport.importedById | 追加 | userId（カード所有者）と取り込み実行者は別概念 |
| timestamps | 全テーブルに追加 | 監査・デバッグ用。createdAt + updatedAt |
| db.ts export名 | `db` | `prisma` ではなく `db` で統一 |

## Codex レビュー（3回実施）

### 第1回: 設計相談

| # | ポイント | Codex判断 |
|---|---------|-----------|
| 1 | Role enum | ADMIN/MEMBER 採用 |
| 2 | SQLite enum | Prisma enum でOK（SQLiteではString保存） |
| 3 | imported_by | 追加推奨 → 追加 |
| 4 | Expense.memo | 追加推奨 → 追加 |
| 5 | Installment.fee | 追加推奨、命名は明確に → `fee` で確定 |
| 6 | timestamps | 全テーブル追加推奨 → 追加 |

### 第2回: 中間レビュー

| # | 重要度 | 指摘内容 | 対応 |
|---|-------|---------|------|
| 1 | Medium | fileHash が index のみで unique でない | `@@unique([userId, fileHash])` に変更 |
| 2 | Medium | importedById に index がない | `@@index([importedById])` 追加 |
| 3 | Medium | Expense に複合 index が弱い | `@@index([userId, date])` 追加 |
| 4 | Low | yearMonth のフォーマット保証 | アプリ層で Zod バリデーション（将来対応） |
| 5 | Low | categoryId の nullable 是非 | CSV未分類許容のため nullable 維持 |

### 第3回: 総合レビュー

| # | 重要度 | 指摘内容 | 対応 |
|---|-------|---------|------|
| 1 | High | postinstall で prisma generate 未設定 | `package.json` に追加済み |
| 2 | Medium | db.ts の型回避（as unknown as） | コメントで理由明記 + createPrismaClient に閉じ込め |
| 3 | Medium | budgets.categoryId が必須だが要件では nullable | nullable に修正済み |
| 4 | Low | Role enum の要件書との不一致 | Issue #3/CLAUDE.md 指定の ADMIN/MEMBER で正しい |

## 将来の課題

- yearMonth フォーマットの Zod バリデーション（`^\d{4}-(0[1-9]|1[0-2])$`）
- Prisma v7 の PrismaClient 型問題が公式修正されたら db.ts の型回避を解消
- onDelete 方針の明示的設定（Cascade/Restrict）
- recordCount/unconfirmedCount の負値防止（アプリ層バリデーション）
