# CLAUDE.md — カケイシェア

## 1. プロジェクト概要

夫婦向け家計共有Webアプリ。カード明細CSV取り込み + Claude AI自動分類で支出を一元管理する。
プライバシーを守りながら家計全体の透明性を確保するのが最大の特徴。
夫（メイン操作）と妻の2ユーザー構成。主にスマホブラウザで使用する。

## 2. 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router) + TypeScript |
| スタイリング | Tailwind CSS + shadcn/ui |
| ORM | Prisma |
| DB（開発） | SQLite (`prisma/dev.db`) |
| DB（本番） | Supabase (PostgreSQL) |
| 認証 | NextAuth.js v4 (Credentials) |
| AI連携 | Anthropic SDK (`@anthropic-ai/sdk`) |
| CSV解析 | papaparse |
| バリデーション | Zod |
| グラフ | Recharts |
| 通知 | LINE Messaging API |
| ホスティング | Vercel |
| パッケージマネージャ | pnpm |

## 3. ディレクトリ構成ルール

```
src/
├── app/                  # Next.js App Router（画面 + APIルート）
│   ├── page.tsx          # ダッシュボード（トップ）
│   ├── expenses/         # 支出管理
│   ├── review/           # 家計レビュー
│   ├── settings/         # 設定
│   └── api/              # APIルート
│       ├── auth/
│       ├── expenses/
│       ├── csv-import/
│       ├── categories/
│       ├── budget/
│       ├── installments/
│       └── ai/           # Claude API連携 (categorize/report/chat)
├── components/           # UIコンポーネント
│   ├── ui/               # shadcn/ui
│   ├── dashboard/
│   ├── expenses/
│   └── layout/
├── lib/                  # ビジネスロジック
│   ├── db.ts             # Prisma Clientシングルトン
│   ├── auth.ts           # 認証設定
│   ├── csv/              # CSV解析（parser.ts + mappings/）
│   ├── ai/               # Claude API (client.ts/categorize.ts/report.ts)
│   └── privacy/filter.ts # プライバシーフィルター
└── types/index.ts        # 型定義
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

### CSV重複検知

```typescript
// 日付 + 店舗名 + 金額のSHA-256ハッシュで重複判定
generateExpenseHash(date, description, amount)
```

## 6. データモデル要約

| テーブル | 主要カラム |
|---------|-----------|
| `users` | id, name, email, role(ADMIN/MEMBER), password |
| `expenses` | id, user_id, date, amount, description, category_id, visibility, is_substitute, actual_amount, source, confirmed, ai_categorized |
| `categories` | id, name, icon, is_fixed_cost, default_visibility, sort_order |
| `budgets` | id, year_month(YYYY-MM), category_id, amount |
| `installments` | id, user_id, description, total_amount, monthly_amount, total_months, remaining_months, start_date, visibility |
| `csv_imports` | id, user_id, card_name, year_month, imported_at, record_count, unconfirmed_count, file_hash |

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
pnpm prisma generate          # Prisma Client再生成（schema変更後に必須）
pnpm prisma migrate dev       # マイグレーション実行
pnpm prisma db seed           # シードデータ投入
pnpm prisma studio            # DB GUIを起動
```

> ⚠️ schema.prisma を変更したら必ず `pnpm prisma generate` を実行すること

## 8. ツール利用ルール

- コード生成時は必ず context7 MCP を使って最新ドキュメントを参照すること
- 特に Next.js, Prisma, shadcn/ui, NextAuth.js の API は context7 で最新仕様を確認してから実装すること

## 9. 参照ドキュメント

詳細はdocs/配下を参照:

| ドキュメント | 内容 |
|------------|------|
| `docs/家計共有アプリ_要件定義書_v2.md` | 機能要件・データモデル・Claude API設計・ロードマップ |
| `docs/カケイシェア_技術スタック・開発環境ガイド.md` | 技術選定・セットアップ・MCP構成・ディレクトリ構成 |
| `docs/カケイシェア_CSVフォーマット定義書.md` | カード別CSVフォーマット・マッピング定義・重複検知 |
| `docs/カケイシェア_画面設計書.md` | 全画面ワイヤーフレーム・プライバシー表示ルール・カラーシステム |
| `docs/カケイシェア_シードデータ定義書.md` | テスト用初期データ・seed.ts実装ガイド・テストチェックリスト |
