# Issue #21: Prisma schema / seed 整合性テスト

## 対応日
2026-02-27

## ブランチ
`feature/issue-21-seed-integrity-test`

## 概要
DB基盤変更時にseed破綻や制約崩れを早期検知するため、seed後の件数と主要参照整合を自動検証するテストを追加。seed再実行で同一状態になることもテストで保証。

## 作成・変更ファイル

### 変更
- `prisma/seed.ts` — `seedDatabase(prisma)` をエクスポートしテストから呼び出し可能に。CLI実行判定を `import.meta.url` で実装。`console.log` を `runSeed()` に移動しテスト時のノイズを排除。

### 新規作成
- `src/lib/db.seed.integration.test.ts` — seed整合性テスト（14テストケース）

## 実装詳細

### 1. seed.ts リファクタリング
- `main()` 関数を `seedDatabase(prisma: PrismaClient)` としてexport
- CLI実行用の `runSeed()` を新設（PrismaClient生成・seed実行・結果表示・切断）
- `import.meta.url === pathToFileURL(process.argv[1]).href` でCLI実行時のみ `runSeed()` を呼び出し

### 2. テスト用DB分離
- `mkdtempSync` で一時ディレクトリを作成
- `prisma migrate deploy` でテスト用SQLite DBにマイグレーション適用
- テスト完了後に `rmSync` でクリーンアップ
- 開発DBに一切影響しない

### 3. テスト内容（14テストケース）

#### seed後の件数検証（7テスト）
- ユーザー: 2件
- カテゴリ: 15件
- カテゴリ公開レベル設定: 3件
- 支出: 44件
- 予算: 28件
- 分割払い: 3件
- CSV取り込み: 3件

#### 参照整合性（5テスト）
- 全支出のuserIdが既存ユーザーを参照
- 全支出のcategoryIdが既存カテゴリを参照
- 全支出のcsvImportId（非null）が既存CSV取り込みを参照
- 全分割払いのuserIdが既存ユーザーを参照
- 全予算のcategoryIdが既存カテゴリを参照

#### 再実行冪等性（2テスト）
- seedを2回実行しても全テーブル件数が同一
- seedの再実行でエラーが発生しない

## レビュー指摘と対応
- Codex（OpenAI）にレビュー依頼
- 指摘1: 冪等性テストに `categoryVisibilitySetting` が含まれていない → 追加修正
- 指摘2: `seedDatabase()` 内の `console.log` がテスト時にノイズ → `runSeed()` に移動
- 再レビューで **APPROVED** を取得

## テスト結果
- 全29テスト（既存15 + 新規14）パス
- `pnpm build` 成功
- `pnpm prisma db seed` 正常動作
