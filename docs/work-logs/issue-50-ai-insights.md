# Issue #50: 削減提案・支出予測（AI Insights）

## 対応日
2026-02-28

## ブランチ
`feature/issue-50-ai-insights`

## 概要
過去6ヶ月の支出データをClaude Sonnetで分析し、カテゴリ別の削減提案と来月の支出予測を1回のAPI呼び出しで生成する機能。

## 作成ファイル

| ファイル | 内容 |
|---------|------|
| `src/lib/ai/generate-insights.ts` | 生成サービス（toAIInsightsInput + generateInsights） |
| `src/lib/ai/generate-insights.test.ts` | 生成サービスのユニットテスト（11テスト） |
| `src/lib/ai/insights-rate-limit.ts` | インメモリレート制限（月5回） |
| `src/lib/ai/insights-rate-limit.test.ts` | レート制限テスト（5テスト） |
| `src/app/api/ai/insights/route.ts` | POST /api/ai/insights エンドポイント |
| `src/components/review/ai-insights-card.tsx` | UIコンポーネント（3状態表示） |
| `docs/work-logs/issue-50-ai-insights.md` | 本ファイル |

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/ai/types.ts` | AIInsightsInput, AISuggestionItem, AIForecastCategoryItem, AIInsightsOutput 型追加 |
| `src/lib/ai/schemas.ts` | aiSuggestionItemSchema, aiForecastCategoryItemSchema, aiInsightsOutputSchema 追加 |
| `src/lib/ai/schemas.test.ts` | aiInsightsOutputSchema のバリデーションテスト追加（7テスト） |
| `src/lib/ai/prompts.ts` | PROMPT_VERSIONS.INSIGHTS, buildInsightsSystemPrompt, buildInsightsUserMessage 追加 |
| `src/lib/ai/index.ts` | 新規型・スキーマ・プロンプトのexport追加 |
| `src/components/review/ReviewClient.tsx` | AIInsightsCard を SummaryTab に追加 |

## 設計判断

| 判断 | 決定 | 理由 |
|------|------|------|
| エンドポイント | 統合1つ POST /api/ai/insights | 同一データソース、コスト削減 |
| レート制限 | レポートと別プール（月5回） | 用途が異なるため別管理 |
| availableMonths | trend.length（0円月も含む） | 旅行月等の有効データを除外しない |
| プライバシー | カテゴリ集計値のみ | 明細（店舗名・メモ）はAIに渡さない |

## Codexレビュー

### 初回レビュー指摘（6件）
1. **(High) 正規表現修正**: `^```json?` → `^```(?:json)?` — 言語指定なしフェンス対応
2. **(High) categoryTrend userId未フィルタ**: 2人世帯家計アプリの設計上、全ユーザー集計が正しい。対応不要
3. **(High) インメモリレート制限**: マルチインスタンス対応は#49と同じ設計判断。対応不要
4. **(Medium) Zodクロスフィールド検証**: `.superRefine()` 追加（targetAmount/savingAmount整合性）
5. **(Medium) availableMonths計算**: `filter(t => t.total > 0)` → `trend.length` に変更
6. **(Medium) エラーログ追加**: `console.error("[ai.insights] 生成失敗:", e)` 追加

### 再レビュー結果
承認。4件の修正に残存不具合なし。

## テスト結果
- 全324テストパス（うち新規21テスト）
- lint: 0 errors（既存warning 4件のみ）
- typecheck: Issue #50関連エラーなし（既存E2E Playwright型エラーのみ）
