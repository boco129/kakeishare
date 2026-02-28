# Issue #52: Phase 4 テスト拡充 + 運用準備 + ドキュメント更新

## 対応日
2026-02-28

## ブランチ
`feature/issue-52-phase4-tests-docs`（develop から分岐）

## 概要
Phase 4 AI機能の E2E テスト基盤を整備し、CI で ANTHROPIC_API_KEY なしでも AI API のテストが実行できるモック機構を導入。レート制限のリセット対応、CI パイプライン改善、ドキュメント更新を実施。

## 作成・変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `src/lib/ai/test-mode.ts` | AI E2E テスト用モック制御（AI_MOCK_MODE 環境変数） |
| `e2e/ai-api.spec.ts` | AI API の E2E テスト（成功/バリデーション/レート制限/認証） |
| `docs/work-logs/issue-52-phase4-tests-docs.md` | 本ファイル |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `src/app/api/ai/report/route.ts` | モックモード対応（success/error/unavailable） |
| `src/app/api/ai/insights/route.ts` | モックモード対応（success/error/unavailable） |
| `src/app/api/ai/chat/route.ts` | モックモード対応（SSEモック応答） |
| `src/app/api/dev/reset-rate-limit/route.ts` | AI レート制限（chat/report/insights）もリセット対象に追加 |
| `.github/workflows/e2e.yml` | `AI_MOCK_MODE: success` + `E2E_TEST_MODE: true` 環境変数追加 |
| `.github/workflows/unit.yml` | `prisma generate` + `pnpm check` ステップ追加 |
| `README.md` | AI 機能セクション追加（環境変数・レート制限・フォールバック仕様） |

## 実装詳細

### 1. AIモック基盤 (`test-mode.ts`)
- 環境変数 `AI_MOCK_MODE` で4モードを切り替え: `off`（デフォルト）, `success`, `error`, `unavailable`
- モックデータ定数: `MOCK_REPORT`, `MOCK_INSIGHTS`, `MOCK_CHAT_RESPONSE`
- 本番コードへの影響: モック判定は API route 内のみ。ビジネスロジック層は非汚染

### 2. API route モック対応
- 3エンドポイント共通パターン: `getAIMockMode()` → `unavailable` なら 503、`success` ならモックデータ返却、`error` なら 503
- chat SSE: `success` 時はモックテキスト → done イベントを即座に返却
- レート制限チェックはモック時も通常通り実行（上限テスト用）

### 3. レート制限リセット拡張
- `/api/dev/reset-rate-limit` で認証レート制限に加え、AI の chat/report/insights レート制限もリセット
- E2E テストの各 describe ブロックで beforeEach リセットを実行

### 4. E2E テスト
- 9テストケース: report成功/バリデーション、insights成功、chat成功/バリデーション、レート制限3種、認証必須
- AI_MOCK_MODE 未設定時はテストをスキップ（CIでは `AI_MOCK_MODE=success` で全テスト実行）

### 5. CI改善
- `unit.yml`: `prisma generate` → `pnpm check`（lint + typecheck）→ `pnpm test:coverage` の順に実行
- `e2e.yml`: `AI_MOCK_MODE=success` でモックAI APIテストが CI で実行可能に

## Codex レビュー指摘と対応
| 重大度 | 指摘内容 | 対応 |
|--------|---------|------|
| High | `AI_MOCK_MODE` が本番で有効化される危険 | `getAIMockMode()` に本番ガード追加（`NODE_ENV=production && CI!==true` で `off` 固定） |
| High | `/api/dev/reset-rate-limit` が `CI=true` で本番開放される既存問題 | `E2E_TEST_MODE=true` の追加条件を導入。`CI=true` のみでは動作しない設計に変更 |
| Medium | E2Eの503許容で回帰テストが甘い | `test.skip(!isMockEnabled())` でモック未設定時はスキップ、CI では厳密検証 |
| Low | テストケース数の記載ミス | 8→9に修正 |

## 将来の課題
- レート制限の DB/Redis 永続化（サーバー再起動耐性）
- AI token使用量の DB 永続化・集計ダッシュボード
- プロンプト回帰テスト（代表的な入力セットに対するスナップショット）
- プライバシーフィルター × AI 機能の網羅テスト
