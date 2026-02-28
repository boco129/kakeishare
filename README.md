# カケイシェア

夫婦向け家計共有Webアプリ。
カード明細CSVを取り込み、支出を一元管理。Claude AI による自動分類を前提に設計。

## プロジェクト概要

- 夫婦それぞれのカード明細をCSV取り込み
- 支出のカテゴリ管理、公開レベル制御（PUBLIC / AMOUNT\_ONLY / CATEGORY\_TOTAL）
- 認証付きで安全に家計を共有
- プライバシーを守りながら家計全体の透明性を確保

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui |
| ORM | Prisma |
| DB（開発） | SQLite (better-sqlite3) |
| DB（本番） | Supabase (PostgreSQL) |
| 認証 | NextAuth v5 (Credentials) |
| バリデーション | Zod |
| テスト | Vitest + Playwright |
| パッケージマネージャ | pnpm |
| ホスティング | Vercel |

## セットアップ手順

```bash
git clone <REPOSITORY_URL>
cd kakeishare
pnpm install

cp .env.example .env
# AUTH_SECRET を32文字以上のランダム値に変更:
#   openssl rand -base64 32

pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev
```

起動後 http://localhost:3000 にアクセス。

## 利用可能なコマンド一覧

| コマンド | 説明 |
|---------|------|
| `pnpm dev` | 開発サーバー起動 |
| `pnpm build` | 本番ビルド |
| `pnpm start` | 本番サーバー起動 |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript 型チェック |
| `pnpm check` | 品質チェック（lint + typecheck） |
| `pnpm test` | 単体テスト（Vitest） |
| `pnpm test:watch` | 単体テスト（watchモード） |
| `pnpm e2e` | E2Eテスト（Playwright） |
| `pnpm e2e:ui` | E2Eテスト（UIモード） |
| `pnpm prisma migrate dev` | マイグレーション実行 |
| `pnpm prisma db seed` | シードデータ投入 |
| `pnpm prisma studio` | DB確認GUI |

## 開発用アカウント情報

シードデータで以下のアカウントが作成されます。

| ユーザー | メールアドレス | ロール | パスワード |
|---------|--------------|--------|-----------|
| 太郎（夫） | taro@example.com | ADMIN | password123 |
| 花子（妻） | hanako@example.com | MEMBER | password123 |

## ディレクトリ構成概要

```text
kakeishare/
├── prisma/              # schema, migrations, seed
├── src/
│   ├── app/             # App Router（ページ・API）
│   │   ├── (app)/       # 認証必須 Route Group
│   │   ├── (auth)/      # 未認証用 Route Group
│   │   └── api/         # APIルート
│   ├── auth.ts          # NextAuth v5 設定
│   ├── components/      # UI / レイアウトコンポーネント
│   ├── lib/             # ドメインロジック・共通処理
│   ├── generated/       # Prisma Client（自動生成）
│   └── types/           # 型定義
├── e2e/                 # Playwright E2Eテスト
├── docs/                # 設計書・作業ログ
└── .github/workflows/   # CI（Unit Tests / E2E Tests）
```

## ドキュメント

詳細は `docs/` 配下を参照:

- `docs/家計共有アプリ_要件定義書_v2.md` — 機能要件・データモデル・ロードマップ
- `docs/カケイシェア_技術スタック・開発環境ガイド.md` — 技術選定・セットアップ
- `docs/カケイシェア_CSVフォーマット定義書.md` — カード別CSVフォーマット
- `docs/カケイシェア_画面設計書.md` — 全画面ワイヤーフレーム
- `docs/カケイシェア_シードデータ定義書.md` — テスト用初期データ
