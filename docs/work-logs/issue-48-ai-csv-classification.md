# Issue #48: CSV取込カテゴリ自動分類 + プライバシー自動付与

## 対応日
2026-02-28

## ブランチ
`feature/issue-48-ai-csv-classification`

## 概要
Phase 4の最重要機能。CSV取り込み時にClaude AI（Haiku）で店舗名からカテゴリを自動分類し、カテゴリの`default_visibility`に基づいてプライバシーレベルを自動付与する。

## 作成ファイル

| ファイル | 説明 |
|---------|------|
| `src/lib/ai/classify.ts` | バッチ分類サービス（Claude API呼び出し + 後処理） |
| `src/lib/ai/classify.test.ts` | classify のユニットテスト（9テスト） |
| `src/lib/csv/ai-classify-step.ts` | CSV取込後のAI分類統合レイヤー |
| `src/lib/csv/ai-classify-step.test.ts` | ai-classify-step のテスト（4テスト） |
| `src/lib/csv/unconfirmed-count.ts` | unconfirmedCount 再計算ヘルパー |
| `src/lib/csv/unconfirmed-count.test.ts` | unconfirmed-count のテスト（2テスト） |
| `src/app/api/expenses/confirm/route.ts` | 一括確認API（PATCH） |
| `src/components/expenses/unconfirmed-banner.tsx` | 未確認バナーコンポーネント |

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/lib/expenses/visibility.ts` | `resolveVisibilityBatch` 追加 |
| `src/lib/expenses/visibility.test.ts` | resolveVisibilityBatch テスト追加（5テスト） |
| `src/lib/expenses/index.ts` | resolveVisibilityBatch エクスポート追加 |
| `src/lib/validations/expense.ts` | expenseBaseSchema に `confirmed` フィールド追加 |
| `src/app/api/csv-import/route.ts` | AI分類ステップ統合 + レスポンスに aiClassified/unconfirmedCount 追加 |
| `src/app/api/expenses/route.ts` | GET に unconfirmedCount サーバー集計値追加 |
| `src/app/api/expenses/[id]/route.ts` | PATCH に confirmed 対応 + DELETE で recalcUnconfirmedCount |
| `src/lib/ai/index.ts` | classify.ts のコメント追加（barrel export 除外） |
| `src/lib/csv/index.ts` | recalcUnconfirmedCount エクスポート追加 |
| `src/components/expenses/expense-card.tsx` | 🟡クリックで個別確認機能追加 |
| `src/components/expenses/expense-list.tsx` | onConfirmed prop 追加 |
| `src/components/expenses/expenses-page-client.tsx` | UnconfirmedBanner 統合 |
| `src/components/expenses/use-expenses.ts` | unconfirmedCount 状態管理追加 |
| `src/components/csv/csv-import-dialog.tsx` | 完了画面にAI分類・要確認件数表示 |

## 実装詳細

### 1. バッチ分類サービス (`classify.ts`)
- `classifyExpenses()`: MAX_CLASSIFICATION_BATCH_SIZE(100件)でチャンク分割
- Claude API → Zodバリデーション → category-resolver で名前→ID解決
- `resolveVisibilityBatch` で CategoryVisibilitySetting 優先の visibility 解決
- confidence: high/medium → confirmed=true, low → confirmed=false
- エラー時フォールバック: 全件「その他」+ confirmed=false

### 2. CSV取込統合 (`ai-classify-step.ts`)
- DB保存後（トランザクション外）でAI分類実行
- `isAIAvailable` チェック → 不可なら null 返却
- `where: { aiCategorized: false }` で冪等性・手動編集保護
- AI失敗時も既存動作を完全維持

### 3. unconfirmedCount 管理
- `recalcUnconfirmedCount` ヘルパーで一括確認・個別PATCH・DELETE 全箇所で整合性保証
- expense GET API にサーバー集計値として追加（ページング依存の過少表示を回避）

### 4. UI変更
- 未確認バナー: サーバー集計の unconfirmedCount を表示 + 表示中のみ一括確認
- ExpenseCard: 🟡クリックで個別確認（自分の支出のみ）
- CsvImportDialog: 完了画面に「AI分類: 実行済み/スキップ」「要確認: N件」

## 設計判断

| 判断事項 | 決定 | 理由 |
|---------|------|------|
| AI分類タイミング | DB保存後（トランザクション外） | API遅延でCSV取込自体を失敗させない |
| visibility解決 | resolveVisibilityBatch | CategoryVisibilitySetting優先の既存仕様維持 |
| barrel export | classify.ts/ai-classify-step.ts を除外 | db/env のトップレベル評価を防ぎテスト互換性維持 |
| 未確認件数表示 | サーバー集計値 | ページング依存の過少表示を回避 |
| 冪等性 | `aiCategorized: false` 条件でupdate | 二重分類・手動編集上書き防止 |

## テスト結果
- 全23ファイル、290テストパス
- 新規テスト: 20テスト追加（classify: 9, ai-classify-step: 4, unconfirmed-count: 2, visibility: 5）
- lint: 0 errors, 4 warnings (全て既存)
- typecheck: 0 new errors (e2e の pre-existing error のみ)
