# Issue #45: Phase 3 E2E・単体テスト拡充 + ドキュメント更新

## 対応日
2026-02-28

## ブランチ
`feature/issue-45-phase3-tests-docs` → `develop`

## 作成・変更ファイル

| ファイル | 内容 |
|---------|------|
| `src/test/setup-jsdom.ts` | jsdom環境用セットアップ（@testing-library/jest-dom + Rechartsモック） |
| `src/components/charts/charts.smoke.test.tsx` | チャートコンポーネント5種のスモークテスト（15テスト） |
| `vitest.config.ts` | jsdomプロジェクトにsetupFiles追加 |
| `CLAUDE.md` | Phase 1-3実装済みに更新、ディレクトリ構成反映 |
| `docs/カケイシェア_技術スタック・開発環境ガイド.md` | Recharts導入済み・AI連携/通知の導入予定を明記 |
| `src/components/charts/CategoryTrendChart.tsx` | categoryKeys取得ロジックを全月のカテゴリ集合から取得するよう修正 |
| `package.json` | @testing-library/react, @testing-library/jest-dom, jsdom 追加 |

## 実装詳細

### テスト

#### 既に実装済みだったテスト（#37〜#44で対応済み）
- 予算API E2Eテスト（`e2e/budget-api.spec.ts`）
- 分割払いAPI E2Eテスト（`e2e/installment-api.spec.ts`）
- ダッシュボード集計API E2Eテスト（`e2e/dashboard-summary-api.spec.ts`）
- 集計ドメイン層ユニットテスト（`src/lib/dashboard/aggregate.test.ts`）

#### 今回追加したテスト
- **チャートコンポーネントスモークテスト**（15テスト）
  - `CategoryPieChart`: 空データ表示、正常データ描画
  - `CategoryTrendChart`: 空データ表示、空カテゴリ表示、正常データ描画、1ヶ月目空+2ヶ月目以降データあり
  - `MonthlyBarChart`: 空データ表示、正常描画、budgetLine有無でReferenceLine分岐
  - `CoupleRatioChart`: 合計0の空表示、正常データで名前・金額表示
  - `BudgetProgressBar`: 予算未設定表示、progressbar描画、100%超クランプ

#### テスト方針
- Rechartsは jsdom でSVG計測が不安定なためモック化
- `src/test/setup-jsdom.ts` でRechartsコンポーネントを軽量div要素にモック
- @testing-library/react + @testing-library/jest-dom でDOM検証

### ドキュメント更新

#### CLAUDE.md
- 技術スタック: `Phase 1-2 実装済み` → `Phase 1-3 実装済み`
- Recharts を実装済みテーブルに移動
- `Phase 3 以降で導入予定` → `Phase 4 以降で導入予定`
- ディレクトリ構成に Phase 3 追加分を反映:
  - API: `budgets/`, `installments/`, `dashboard/summary/`
  - コンポーネント: `charts/`, `dashboard/`, `review/`
  - ライブラリ: `dashboard/`, `chart-colors.ts`, `chart-format.ts`
- 将来追加予定から `src/components/dashboard/` を削除（実装済み）

#### 技術スタックガイド
- フルスタック構成テーブルに導入状態を明記（Phase 3導入済み / Phase 4予定 等）

## レビュー指摘と対応

### Codex レビュー（1回目）
1. **[中] RechartsモックがDOMに無効propを漏らして大量warning** → `pickDomProps`で有効属性のみ転送するよう修正
2. **[中] CategoryTrendChartのcategoryKeys取得ロジックの問題** → `data[0].categories`のみではなく全月のカテゴリ集合からユニークキーを取得するよう実装修正 + テスト追加

## テスト結果
- ユニットテスト: 14ファイル 208テスト全パス
- 既存TypeScriptエラー: E2E側のPlaywright型問題（既存、今回の変更とは無関係）

## 将来の課題
- E2E側のPlaywright型エラー（`Playwright` export）の修正
- チャートコンポーネントのビジュアルリグレッションテスト（Playwright screenshot比較）
