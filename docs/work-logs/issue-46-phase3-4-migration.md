# Issue #46: Phase 3→4 移行準備の洗い出し

## 対応日
2026-02-28

## ブランチ
`feature/issue-46-phase3-4-migration`

## 概要
Phase 3（ダッシュボード・予算・グラフ・分割払い）完了後、Phase 4（Claude AI連携）に進む前に必要な準備対応を実施した。

## 作成・変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `src/lib/ai/index.ts` | AI連携モジュール公開エントリポイント |
| `src/lib/ai/types.ts` | AI結果型定義（AICategoryResult, AICategoryInput, AIReportInput 等） |
| `src/lib/ai/schemas.ts` | LLM出力のZodバリデーションスキーマ |
| `src/lib/ai/config.ts` | 境界ガード（API_KEY未設定時のエラー制御） |
| `src/lib/ai/config.test.ts` | 境界ガードのユニットテスト（5テスト） |
| `src/lib/ai/schemas.test.ts` | Zodスキーマのユニットテスト（8テスト） |
| `docs/work-logs/issue-46-phase3-4-migration.md` | 本ドキュメント |

### 変更
| ファイル | 内容 |
|---------|------|
| `src/lib/env-schema.ts` | `ANTHROPIC_API_KEY` を optional で追加、validateEnv でパース対象に追加 |
| `src/lib/env.test.ts` | ANTHROPIC_API_KEY のテストケース4件追加（計26テスト） |
| `.env.example` | ANTHROPIC_API_KEY のプレースホルダー追加（コメントアウト状態） |
| `CLAUDE.md` | Phase 4 ディレクトリ構成追記、Claude API連携注意事項詳細化、関数名ズレ修正 |

## 実装詳細

### 1. 環境変数スキーマ更新
- `ANTHROPIC_API_KEY` を `z.string().min(1).optional()` で定義
- Phase 3のみの環境でも正常動作を維持（optional設計）
- `.env.example` にはコメントアウトで記載し、必要時に有効化

### 2. AI用ディレクトリ・型定義
- `src/lib/ai/` ディレクトリを作成し、Phase 4で必要な型・スキーマ・設定を事前定義
- **型定義**: `AICategoryResult`（expenseId, categoryId, confidence, suggestedVisibility, confirmed）
- **Zodスキーマ**: `aiCategoryOutputSchema`（Claude APIレスポンスの揺れを検知）
- **境界ガード**: `getAnthropicApiKeyOrThrow()` でAI呼び出し時のみ必須チェック

### 3. CLAUDE.md 更新
- Phase 4ディレクトリ構成を具体的に記載（将来予定 → 実ファイル一覧）
- Claude API連携注意事項にZod検証・境界ガード・カテゴリ名解決の方針を追加
- CSV重複検知関数名のズレを修正（`generateExpenseHash` → `generateExpenseDedupeHash`）

## Codexレビュー指摘と対応

| # | 指摘（Codex） | 重要度 | 対応 |
|---|-------------|--------|------|
| 1 | AI結果型に `expenseId`, `suggestedVisibility`, `confirmed` が不足 | High | types.ts で `AICategoryResult` に全フィールド追加 |
| 2 | optional env + 呼び出し時境界ガードが必要 | High | config.ts に `getAnthropicApiKeyOrThrow()` 実装 |
| 3 | LLM出力のZod検証を準備段階で定義すべき | Medium | schemas.ts に `aiCategoryOutputSchema` 定義 |
| 4 | CI で AI経路のテスト方針 | Medium | Phase 4 Issue作成時の要件として記録 |
| 5 | CLAUDE.md 関数名ズレ修正 | Low | `generateExpenseHash` → `generateExpenseDedupeHash` 修正 |

## Phase 4 Issue 作成計画

Phase 4 は以下の4つのサブIssueに分解して実施予定:

| Issue | タイトル | 内容 |
|-------|---------|------|
| 1 | Anthropic SDK 導入 + クライアント基盤 | SDK インストール、クライアントラッパー、カテゴリ名→ID解決レイヤー |
| 2 | CSV取込カテゴリ自動分類 | バッチ分類API、プライバシーレベル自動付与、確認UI |
| 3 | 月次レポート自動生成 | プライバシー考慮集計 → Sonnet → レポート生成API |
| 4 | チャットアドバイザーUI | 家計相談チャット画面、プライバシー制御、会話履歴 |

## テスト結果
- ユニットテスト: 225テスト全通過（16ファイル）
- 新規テスト: 13テスト追加（config.test.ts: 5, schemas.test.ts: 8）
- typecheck: e2e既存エラー（Playwright型）のみ、今回の変更によるエラーなし
