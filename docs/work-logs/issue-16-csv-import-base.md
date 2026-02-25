# Issue #16: CSV取り込み基盤（パーサー・マッピング・重複検知）

## 対応日
2026-02-25

## ブランチ
`feature/issue-16-csv-import-base`（develop から分岐）

## 作成ファイル

| ファイル | 内容 |
|---------|------|
| `src/lib/csv/types.ts` | CSV取り込み共通型定義（CardCsvDefinition, NormalizedExpenseRow等） |
| `src/lib/csv/mappings/epos.ts` | エポスカード CSVマッピング定義 |
| `src/lib/csv/mappings/mufg-jcb.ts` | MUFG JCBカード CSVマッピング定義 |
| `src/lib/csv/mappings/mufg-visa.ts` | MUFG VISAカード CSVマッピング定義 |
| `src/lib/csv/mappings/index.ts` | マッピング一覧エクスポート・CardType検証 |
| `src/lib/csv/parser.ts` | CSV解析ロジック（iconv-lite + csv-parse） |
| `src/lib/csv/hash.ts` | 重複検知ハッシュ生成（SHA-256） |
| `src/lib/csv/index.ts` | CSVモジュール公開API |
| `src/lib/validations/csv-import.ts` | CSV取り込みバリデーションスキーマ（Zod） |
| `src/app/api/csv-import/route.ts` | POST /api/csv-import APIルート |
| `prisma/migrations/20260225000000_add_expense_dedupe_hash/migration.sql` | dedupeHashカラム追加マイグレーション |

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `prisma/schema.prisma` | Expenseモデルに `dedupeHash` カラム + インデックス追加 |
| `package.json` / `pnpm-lock.yaml` | csv-parse, iconv-lite を追加 |

## 実装詳細

### パッケージ選定
- **csv-parse**（papaparseの代わり）: サーバーサイド向けで依存が軽量、型付けしやすい
- **iconv-lite**: Shift_JIS→UTF-8変換。サーバー側で変換することでクライアント依存を排除

### CSVマッピングシステム
- `CardCsvDefinition` インターフェースで型安全にカード会社別定義を管理
- `alternateColumns` でカラム名のバリエーションに対応（MUFG VISA等）
- `extractFrom` + `pattern` で支払区分から分割回数を正規表現抽出

### 重複検知
- **明細レベル**: `generateExpenseDedupeHash(userId, cardType, date, description, amount)` のSHA-256ハッシュ
- **件数比較方式**: `@@unique` ではなく `@@index` + `groupBy` で既存件数と比較。同日同店同額の複数利用に対応
- **ファイルレベル**: `generateFileHash(buffer)` で同一ファイル再取り込みを防止（CsvImport.fileHash）

### API設計（POST /api/csv-import）
- `multipart/form-data` でファイル + メタデータ受信
- ファイルサイズ上限5MB、行数上限5,000行
- 権限チェック: 他人のカードCSV取り込みはADMINのみ
- トランザクションで CsvImport + Expense を一括保存
- 全件 `confirmed: false`, `aiCategorized: false`, `categoryId: null` で保存

### 金額パース
- 全角数字、全角カンマ、¥記号、(1234)形式の負数に対応
- `parseInt` ではなく完全一致正規表現 + `Number()` で厳密検証

## Codexレビュー指摘と対応

| # | 重要度 | 指摘 | 対応 |
|---|--------|------|------|
| 1 | High | `parseInt`が不正値を受け入れる | 完全一致正規表現 + `Number()` に変更 |
| 2 | High | `@@unique`が同日同店同額の2回利用を潰す | `@@index` + 件数比較方式に変更 |
| 3 | High | 不正CSV時に500エラー | `parseCsv`を`try-catch`で囲み400を返す |
| 4 | Medium | `ownerUserId`の型制約が弱い | `.cuid()`バリデーションに変更 |
| 5 | Medium | yearMonthとCSV明細月の整合チェックなし | 整合チェック追加 |
| 6 | Medium | `hasHeader`が未使用 | コメントで明記（現時点では全カード会社がヘッダー付き） |
| 7 | Medium | `new Date('YYYY-MM-DD')`がUTC解釈 | `toLocalDate()`ヘルパーに変更 |

## 将来の課題
- Phase 4: AI分類（Claude API）連携時に `confirmed: true`, `aiCategorized: true` への更新フロー
- 実CSVでのフォーマット検証（推定フォーマットに基づく実装のため）
- カスタムマッピングUI（未知のカード会社への対応）
- テストコード追加（パーサー・重複検知のユニットテスト）
