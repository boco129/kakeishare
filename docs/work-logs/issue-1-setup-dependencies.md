# Issue #1: Phase1 依存パッケージ導入とバージョン整合

## 基本情報

| 項目 | 内容 |
|------|------|
| Issue | [#1](https://github.com/boco129/kakeishare/issues/1) |
| 対応日 | 2026-02-23 |
| ブランチ | `feature/issue-1-setup-dependencies` |
| マージ先 | `develop` |
| コミット | `3526ada` |

## 作成・変更ファイル一覧

| ファイル | 操作 | 内容 |
|---------|------|------|
| `package.json` | 変更 | 依存パッケージ追加、engines.node明記、pnpm.onlyBuiltDependencies設定 |
| `pnpm-lock.yaml` | 変更 | ロックファイル更新 |
| `.env.example` | 新規 | 環境変数テンプレート（DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL） |
| `.gitignore` | 変更 | `!.env.example` を追加（.env.exampleがGit追跡されるように） |
| `CLAUDE.md` | 新規 | プロジェクト概要・技術スタック・コーディングルール・業務ルール・Gitブランチ運用 |
| `docs/家計共有アプリ_要件定義書_v2.md` | 新規 | 要件定義書をリポジトリに追加 |
| `docs/カケイシェア_技術スタック・開発環境ガイド.md` | 新規 | 技術ガイドをリポジトリに追加（Next.js 16, NextAuth v4に更新） |
| `docs/カケイシェア_CSVフォーマット定義書.md` | 新規 | CSVフォーマット定義書を追加 |
| `docs/カケイシェア_画面設計書.md` | 新規 | 画面設計書を追加 |
| `docs/カケイシェア_シードデータ定義書.md` | 新規 | シードデータ定義書を追加 |

## 実装詳細

### 追加パッケージ

**dependencies:**
- `next-auth@4.24.13` — 認証（Next.js 16互換のためv4を採用）
- `@auth/prisma-adapter@2.11.1` — NextAuth用Prismaアダプター
- `@prisma/client@7.4.1` — Prisma ORM クライアント
- `zod@4.3.6` — バリデーション
- `bcryptjs@3.0.3` — パスワードハッシュ

**devDependencies:**
- `prisma@7.4.1` — Prisma CLI

### 技術判断

| 判断事項 | 決定 | 理由 |
|---------|------|------|
| NextAuth バージョン | v4（v5ではなく） | next-auth v5 beta の peerDependencies が `next: ^14 \|\| ^15` で Next.js 16 未対応。v4は `^16` を含む |
| Next.js バージョン | 16.1.6 を維持 | create-next-appで生成済み。ダウングレードの手間と安定性を考慮 |
| `@types/bcryptjs` | 削除 | bcryptjs v3は型定義を内包しており、@types/bcryptjsはdeprecatedスタブ |
| Node.js要件 | `>=20.19.0` を明記 | Prisma 7.x の peerDependencies が `^20.19 \|\| ^22.12 \|\| >=24.0` |

### Codexレビューで対応した指摘

1. **`@types/bcryptjs` の削除** — deprecated であり不要
2. **Node.jsバージョン要件の明示** — `package.json` の `engines` に追加
3. **ドキュメント間のバージョン整合** — 技術ガイドのNext.js 15→16、Auth.js v5→NextAuth v4 に修正

## 将来の課題

- NextAuth v5 が Next.js 16 を正式サポートした場合、v5への移行を検討
- `.env.example` の変数は Phase が進むにつれ追加が必要（Anthropic API Key, LINE API Key等）
