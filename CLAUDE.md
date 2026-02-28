# CLAUDE.md — カケイシェア

## 1. プロジェクト概要

夫婦向け家計共有Webアプリ。カード明細CSV取り込み + Claude AI自動分類で支出を一元管理する。
プライバシーを守りながら家計全体の透明性を確保するのが最大の特徴。
夫（メイン操作）と妻の2ユーザー構成。主にスマホブラウザで使用する。

## 2. 技術スタック

### Phase 1-3 実装済み

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Next.js 16.1.6 (App Router) + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui |
| ORM | Prisma 7.4.1 |
| DB（開発） | SQLite（better-sqlite3 adapter, `prisma/dev.db`） |
| DB（本番） | Supabase (PostgreSQL) |
| 認証 | next-auth 5.0.0-beta.30（Credentials） |
| バリデーション | Zod 4.3.6 |
| CSV解析 | csv-parse + iconv-lite |
| グラフ | Recharts 2.x |
| パッケージマネージャ | pnpm |
| ホスティング | Vercel |

### Phase 4 実装済み

| レイヤー | 技術 |
|---------|------|
| AI連携 | Anthropic SDK (`@anthropic-ai/sdk`) |
| AIテスト基盤 | AI_MOCK_MODE 環境変数によるモック切替 |

### Phase 5 以降で導入予定

| レイヤー | 技術 |
|---------|------|
| 通知 | LINE Messaging API |

## 3. ディレクトリ構成ルール

```
src/
├── app/                       # Next.js App Router
│   ├── (app)/                 # 認証必須 Route Group
│   │   ├── layout.tsx         # セッションチェック + AppShell
│   │   ├── page.tsx           # ダッシュボード（トップ）
│   │   ├── expenses/page.tsx  # 支出管理
│   │   ├── review/page.tsx    # 家計レビュー
│   │   └── settings/page.tsx  # 設定
│   ├── (auth)/                # 未認証用 Route Group
│   │   └── login/page.tsx     # ログイン画面
│   └── api/                   # APIルート
│       ├── auth/[...nextauth]/route.ts
│       ├── expenses/          # 支出CRUD API
│       ├── categories/        # カテゴリAPI
│       ├── budgets/           # 予算CRUD API
│       ├── installments/      # 分割払いCRUD API
│       ├── dashboard/summary/ # ダッシュボード集計API
│       ├── csv-import/        # CSV取り込みAPI
│       └── dev/               # 開発用API
├── auth.ts                    # NextAuth v5 設定（src直下、@/auth でimport）
├── components/                # UIコンポーネント
│   ├── ui/                    # shadcn/ui
│   ├── layout/                # AppShell・ナビゲーション
│   ├── expenses/              # 支出関連コンポーネント
│   ├── csv/                   # CSV取り込みコンポーネント
│   ├── charts/                # Rechartsチャートコンポーネント
│   ├── dashboard/             # ダッシュボードコンポーネント
│   ├── review/                # レビュー画面コンポーネント
│   └── settings/              # 設定コンポーネント
├── generated/prisma/          # Prisma Client（自動生成）
├── lib/                       # ビジネスロジック
│   ├── api/                   # APIハンドラ共通処理
│   ├── auth/                  # 認証・レート制限・監査ログ
│   ├── csv/                   # CSV解析・マッピング・取込処理
│   ├── dashboard/             # ダッシュボード集計ドメインロジック
│   ├── expenses/              # 支出ビジネスロジック
│   ├── privacy/               # プライバシーフィルタリング
│   ├── validations/           # Zodバリデーションスキーマ
│   ├── db.ts                  # Prisma Clientシングルトン
│   ├── auth-utils.ts          # 認証ヘルパー
│   ├── chart-colors.ts        # チャート用カラーパレット
│   ├── chart-format.ts        # チャート用フォーマッタ
│   └── utils.ts               # 汎用ユーティリティ
└── types/
    └── next-auth.d.ts         # NextAuth 型拡張

middleware.ts                  # ルート保護（Edge Runtime, JWT判定）
prisma/
├── schema.prisma              # データベーススキーマ
└── seed.ts                    # シードデータ
```

### Phase 4 で追加済みのディレクトリ

```
src/lib/ai/                    # Claude AI連携（Phase 4）
├── index.ts                   # 公開エントリポイント
├── client.ts                  # Anthropic SDK クライアント生成
├── types.ts                   # AI結果型定義（AICategoryResult 等）
├── schemas.ts                 # LLM出力のZodバリデーション
├── config.ts                  # 境界ガード（API_KEY未設定時のエラー制御）
├── classify.ts                # CSV取込時の自動カテゴリ分類（Haiku）
├── category-resolver.ts       # カテゴリ名→ID解決レイヤー
├── prompts.ts                 # プロンプトテンプレート
├── generate-report.ts         # 月次家計レポート生成（Sonnet）
├── generate-insights.ts       # 削減提案・支出予測（Sonnet）
├── build-chat-context.ts      # チャット用コンテキスト構築
├── usage-logger.ts            # AIトークン使用量ログ
├── chat-rate-limit.ts         # チャット: 20回/日
├── report-rate-limit.ts       # レポート: 5回/月
├── insights-rate-limit.ts     # 削減提案: 5回/月
└── test-mode.ts               # E2Eテスト用モック制御

src/app/api/ai/               # AI APIルート
├── chat/route.ts              # SSEストリーミングチャット
├── report/route.ts            # 月次レポート生成
└── insights/route.ts          # 削減提案・支出予測

src/components/chat/           # チャットUI
└── ChatClient.tsx             # AIチャットアドバイザー

src/components/review/         # レビュー画面（AI機能含む）
├── ai-report-card.tsx         # 月次AIレポート表示
└── ai-insights-card.tsx       # 削減提案・支出予測パネル
```

## 4. コーディングルール

- **Server Components デフォルト** — `"use client"` は useState/onClick等が必要な場合のみ
- **API層でプライバシーフィルタリング** — フロントに非公開データを渡さない
- **Zodでバリデーション** — APIルートの入力は必ずZodでパース
- **DB操作は `src/lib/db.ts` 経由** — Prisma Clientを直接importしない
- **日本語コメント推奨**
- **金額は integer（円単位）** — floatを使わない
- **カテゴリ自動分類はバッチ処理** — 1回のAPI呼び出しで複数件まとめて処理

## 5. 重要な業務ルール

### プライバシー3段階

| visibility | 相手から見える情報 |
|------------|------------------|
| `PUBLIC` | 全フィールド（日付・金額・店舗名・カテゴリ） |
| `AMOUNT_ONLY` | 日付・金額・カテゴリのみ。店舗名は「個人支出」にマスク |
| `CATEGORY_TOTAL` | 明細非表示。月次カテゴリ合計のみ |

- 自分の支出は公開レベルに関係なく常に全詳細を閲覧可能
- CSV取り込み → Claude分類 → カテゴリのdefault_visibilityを自動適用
- 明細単位で手動上書き可（自分の支出のみ）

### API層フィルタリング（必須）

```
リクエスト元ユーザーを判定
→ 相手の支出に visibility フィルター適用
  - PUBLIC: 全フィールド返却
  - AMOUNT_ONLY: description を「個人支出」に置換
  - CATEGORY_TOTAL: 明細を返さず集計値のみ
```

### Claude API連携での注意

- CATEGORY_TOTAL支出はプロンプトに集計値のみ渡す（明細は含めない）
- カテゴリ分類はHaiku（コスト効率）、レポート・チャットはSonnet
- 分類結果の確信度がlowの場合は `confirmed: false` で人間確認を促す
- **環境変数**: `ANTHROPIC_API_KEY` は optional — 未設定でもPhase 3機能は正常動作
- **境界ガード**: AI呼び出し時は `getAnthropicApiKeyOrThrow()` で必須チェック（`src/lib/ai/config.ts`）
- **出力検証**: Claude APIレスポンスは `aiCategoryOutputSchema`（Zod）で必ず検証する（`src/lib/ai/schemas.ts`）
- **カテゴリ名解決**: Claude APIはカテゴリ「名前」を返すため、`categoryId` への変換レイヤーが必要

### CSV重複検知

```typescript
// userId + カード種別 + 日付 + 店舗名 + 金額のSHA-256ハッシュで重複判定
generateExpenseDedupeHash(userId, cardType, date, description, amount)
```

## 6. データモデル要約

| テーブル | 主要カラム |
|---------|-----------|
| `users` | id, name, email, role(ADMIN/MEMBER), password |
| `expenses` | id, user_id, date, amount, description, category_id, visibility, is_substitute, actual_amount, source, confirmed, ai_categorized, memo |
| `categories` | id, name, icon, is_fixed_cost, default_visibility, sort_order |
| `budgets` | id, year_month(YYYY-MM), category_id, amount |
| `installments` | id, user_id, description, total_amount, monthly_amount, total_months, remaining_months, start_date, visibility, fee |
| `csv_imports` | id, user_id, imported_by_id, card_name, year_month, imported_at, record_count, unconfirmed_count, file_hash |

### カード会社対応（CSVマッピング）

- エポスカード（妻）: `src/lib/csv/mappings/epos.ts`
- MUFG JCBカード（夫）: `src/lib/csv/mappings/mufg-jcb.ts`
- MUFG VISAカード（夫）: `src/lib/csv/mappings/mufg-visa.ts`
- エンコーディング: Shift_JIS → UTF-8変換が必要

### シードデータ

- 夫: 太郎 / taro@example.com / role: ADMIN
- 妻: 花子 / hanako@example.com / role: MEMBER
- 2026年1月分の支出（1月分CSV取込済み、2月分未取込のアラートテスト用）

## 7. よく使うコマンド

```bash
pnpm dev                      # 開発サーバー起動
pnpm build                    # 本番ビルド
pnpm check                    # lint + typecheck
pnpm test                     # ユニットテスト実行
pnpm test:coverage            # カバレッジ付きテスト
pnpm coverage                 # test:coverage のエイリアス
pnpm e2e                      # E2Eテスト実行
pnpm prisma generate          # Prisma Client再生成（schema変更後に必須）
pnpm prisma migrate dev       # マイグレーション実行
pnpm prisma db seed           # シードデータ投入
pnpm prisma studio            # DB GUIを起動
```

> ⚠️ schema.prisma を変更したら必ず `pnpm prisma generate` を実行すること

## 8. Git ブランチ運用ルール

- **Issue対応時は必ずfeatureブランチを作成する**
  - ブランチ名: `feature/issue-<番号>-<概要>` (例: `feature/issue-3-prisma-schema`)
  - developブランチから分岐すること
- **作業完了後はdevelopブランチにマージする**
  - `git checkout develop && git merge --no-ff <featureブランチ>`
  - マージ後、リモートにpushし、該当Issueをcloseする
- **mainブランチには直接コミットしない**
  - mainへのマージはPhase完了時など節目で行う
- **CI連携ブランチへのpush後はGitHub Actionsの結果を確認する**
  - `main`, `develop` ブランチへのpush時に Unit Tests と E2E Tests が自動実行される
  - `gh run list --branch <ブランチ名> --limit 2` で最新のrun結果を確認すること
  - CIが失敗した場合は `gh run view <run-id> --log-failed` で原因を調査し、修正してから次の作業に進むこと
  - pull_request作成時にも同様にCIが走るため、マージ前に全runがsuccessであることを確認する
- **作業完了後は対応ログを作成する**
  - `docs/work-logs/issue-<番号>-<概要>.md` に対応内容をまとめる
  - 対応日、ブランチ名、作成・変更ファイル一覧、実装詳細、レビュー指摘と対応、将来の課題を含める

## 9. ツール利用ルール

- コード生成時は必ず context7 MCP を使って最新ドキュメントを参照すること
- 特に Next.js, Prisma, shadcn/ui, NextAuth.js の API は context7 で最新仕様を確認してから実装すること

## 10. 参照ドキュメント

詳細はdocs/配下を参照:

| ドキュメント | 内容 |
|------------|------|
| `docs/家計共有アプリ_要件定義書_v2.md` | 機能要件・データモデル・Claude API設計・ロードマップ |
| `docs/カケイシェア_技術スタック・開発環境ガイド.md` | 技術選定・セットアップ・MCP構成・ディレクトリ構成 |
| `docs/カケイシェア_CSVフォーマット定義書.md` | カード別CSVフォーマット・マッピング定義・重複検知 |
| `docs/カケイシェア_画面設計書.md` | 全画面ワイヤーフレーム・プライバシー表示ルール・カラーシステム |
| `docs/カケイシェア_シードデータ定義書.md` | テスト用初期データ・seed.ts実装ガイド・テストチェックリスト |
