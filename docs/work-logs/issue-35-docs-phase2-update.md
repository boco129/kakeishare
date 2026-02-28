# Issue #35: CLAUDE.md・技術ドキュメントの Phase 2 実態反映

## 対応日
2026-02-28

## ブランチ
`feature/issue-35-docs-phase2-update` → `develop`

## 変更ファイル一覧
- `CLAUDE.md` — 技術スタック・ディレクトリ構成・コマンド一覧を更新
- `docs/カケイシェア_技術スタック・開発環境ガイド.md` — ライブラリ名・バージョン情報を更新
- `docs/カケイシェア_CSVフォーマット定義書.md` — CSVライブラリ記載を更新

## 実装詳細

### CLAUDE.md
- §2 技術スタック: 「Phase 1 実装済み」→「Phase 1-2 実装済み」、csv-parse + iconv-lite 追加、papaparse 削除、「Phase 3 以降で導入予定」に変更
- §3 ディレクトリ構成: 実装済みディレクトリをツリーに反映
  - api/: expenses/, categories/, csv-import/, dev/
  - components/: expenses/, csv/, settings/
  - lib/: api/, auth/, csv/, expenses/, privacy/, validations/
- §3 将来追加予定: Phase 3以降に変更、ai/ と dashboard/ のみに整理
- §7 コマンド: pnpm check, test, test:coverage, coverage, e2e を追加

### 技術スタック・開発環境ガイド
- NextAuth.js v4 → next-auth v5 (beta)
- Next.js 15 → Next.js 16
- papaparse → csv-parse + iconv-lite（3箇所）
- next-auth → next-auth@beta（インストールコマンド）
- 最終更新日: 2026-02-28

### CSVフォーマット定義書
- papaparse → csv-parse/sync
- 最終更新日: 2026-02-28

## レビュー指摘と対応（Codex）

### 第1回レビュー
1. High: 技術ガイドの NextAuth.js v4 / Next.js 15 が古い → v5 / 16 に修正
2. Medium: papaparse置換時に @types/papaparse 削除と iconv-lite 併記が必要 → 反映
3. Medium: ディレクトリ構成の下位エンドポイントは例示表記にすべき → 反映
4. Low: §7 に pnpm check も併記推奨 → 追加

### 最終レビュー
- 承認（Approve）。全指摘反映確認済み
- 非ブロッカー提案: next-auth@beta 明示 → 反映

## 将来の課題
- Phase 3 実装開始時にドキュメントを再度更新
- README.md のディレクトリ構成も同様に更新を検討
