# Issue #33: coverage スクリプト追加 + CI カバレッジレポート設定

## 対応日
2026-02-28

## ブランチ
`feature/issue-33-coverage-script` → `develop`

## 変更ファイル一覧
- `package.json` — `test:coverage` / `coverage` スクリプト追加
- `.github/workflows/unit.yml` — CI でカバレッジ取得 + アーティファクト保存

## 実装詳細

### package.json
- `"test:coverage": "vitest run --coverage"` — カバレッジ付きテスト実行
- `"coverage": "pnpm test:coverage"` — エイリアス（`pnpm coverage` で実行可）

### .github/workflows/unit.yml
- 既存の `pnpm test` を `pnpm test:coverage` に変更（テスト1回でcoverageも取得、2重実行回避）
- `actions/upload-artifact@v4` で `coverage/` ディレクトリをアーティファクト保存
  - `if: always()` — テスト失敗時もアップロードを試行
  - `if-no-files-found: warn` — coverage未生成時はエラーではなく警告に留める
  - `retention-days: 14` — 14日間保持
  - artifact名: `coverage-report`

## レビュー指摘と対応（Codex）

### 第1回レビュー
1. CIで `pnpm test` + `pnpm coverage` だとテスト2回実行になる → `pnpm test:coverage` 1回に統合
2. `if: always()` を追加してテスト失敗時もartifactアップロード
3. スクリプト名は `test:coverage` をメインに、`coverage` はエイリアスに

### 第2回レビュー
1. `if-no-files-found: error` → `warn` に変更（テスト失敗時のエラー重複回避）
2. artifact名を `coverage-html` → `coverage-report` に変更（実体に合わせる）

### 最終レビュー
- 承認（Approve）。Blocking/Critical/Major の問題なし

## 将来の課題
- カバレッジ閾値の設定（例: statements 60%）はテスト充実後に検討
- PR コメントへのカバレッジサマリ自動投稿（codecov等）の検討
