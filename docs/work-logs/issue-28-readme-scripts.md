# Issue #28 README と品質スクリプトを Phase 1 実態に更新

## 対応日
2026-02-28

## ブランチ
`feature/issue-28-readme-scripts` → `develop` にマージ

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `README.md` | create-next-appテンプレートからプロジェクト実態に全面書き換え |
| `package.json` | typecheck, check スクリプト追加、lint を `eslint .` に変更 |
| `.env.example` | DATABASE_URL を `file:./prisma/dev.db` に修正 |
| `prisma/seed-guard.ts` | env 型を `Record<string, string \| undefined>` に緩和 |
| `src/lib/db.seed.integration.test.ts` | categoryId の null チェック追加 |

## 実装詳細

### 1. README.md 全面書き換え
- プロジェクト概要（カケイシェアの説明・特徴）
- 技術スタック一覧（テーブル形式）
- セットアップ手順（clone → install → env → migrate → seed → dev）
- 利用可能なコマンド一覧（テーブル形式）
- 開発用アカウント情報（太郎/花子のシードデータ）
- ディレクトリ構成概要（ツリー形式）
- ドキュメントリンク一覧

### 2. package.json スクリプト追加
- `"typecheck": "tsc --noEmit"` — TypeScript型チェック
- `"check": "pnpm lint && pnpm typecheck"` — 品質チェック一括実行
- `"lint"` を `"eslint"` → `"eslint ."` に変更（対象明示）

### 3. .env.example 不整合修正
- `DATABASE_URL` を `file:./dev.db` → `file:./prisma/dev.db` に修正
- seed-guard の ALLOWED_EXACT_PATHS（`./prisma/dev.db`）と整合させた
- 新規開発者が `.env.example` をコピーしてそのまま seed 実行可能に

### 4. 型エラー修正（typecheck導入に伴う既存コード修正）
- `prisma/seed-guard.ts`: `GuardOptions.env` の型を `NodeJS.ProcessEnv` → `Record<string, string | undefined>` に緩和
  - テストで NODE_ENV を省略したオブジェクトを渡す際の型エラーを解消
  - ランタイム挙動に変更なし
- `src/lib/db.seed.integration.test.ts`: `categoryId` が `string | null` 型のため `categoryIds.has()` の前に null チェックを追加

## レビュー指摘と対応（Codex Review）

| 指摘 | 重要度 | 対応 |
|------|--------|------|
| .env.example の DATABASE_URL が seed-guard と不整合 | High | `file:./prisma/dev.db` に修正 |
| CIで check が実行されない | Medium | Issue #28 スコープ外、将来対応 |
| lint を `eslint .` に変更推奨 | Low | 対応済み |

## 将来の課題
- CI（GitHub Actions）に `pnpm check` ステップを追加
- 既存の lint warning 4件の解消
