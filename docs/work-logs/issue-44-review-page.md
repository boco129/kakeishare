# Issue #44 レビュー画面実装（家計レビュー）

## 対応日
2026-02-28

## ブランチ
`feature/issue-44-review-page`

## 作成・変更ファイル一覧

### 新規作成
- `src/components/ui/tabs.tsx` — shadcn/ui Tabsコンポーネント
- `src/components/charts/CategoryTrendChart.tsx` — カテゴリ別月次推移折れ線グラフ
- `src/components/review/ReviewClient.tsx` — レビュー画面クライアントコンポーネント（3タブ構成）
- `src/components/review/ReviewDataSection.tsx` — レビューデータ取得サーバーコンポーネント
- `src/lib/dashboard/get-review-summary.ts` — レビューサマリー取得関数

### 変更
- `src/app/(app)/review/page.tsx` — プレースホルダーから完全実装へ
- `src/components/dashboard/MonthSelector.tsx` — basePath prop追加、usePathnameフォールバック
- `src/components/charts/index.ts` — CategoryTrendChart export追加
- `src/lib/dashboard/aggregate.ts` — aggregateCategoryTrend関数追加
- `src/lib/dashboard/aggregate.test.ts` — aggregateCategoryTrendテスト5件追加
- `src/lib/dashboard/types.ts` — CategoryTrendEntry型追加
- `src/lib/dashboard/index.ts` — 新規export追加

## 実装詳細

### レビュー画面（3タブ構成）

#### サマリータブ
- 今月支出合計 + 予算残表示
- 前月比（金額差・比率）
- 予算消化率バー（BudgetProgressBar再利用）
- 夫婦負担比率（CoupleRatioChart再利用）
- カテゴリTOP5横棒グラフ（Recharts BarChart + Cell）
- Claude AI洞察カードプレースホルダー（Phase4用）

#### カテゴリタブ
- カテゴリ別支出円グラフ（CategoryPieChart再利用）
- カテゴリ詳細一覧（金額・割合）
- 予算 vs 実績プログレスバー

#### 推移タブ
- 月次支出推移棒グラフ（MonthlyBarChart再利用、予算ライン付き）
- カテゴリ別推移TOP5折れ線グラフ（CategoryTrendChart新規）

### データ取得
- `getReviewSummary()` でDashboardSummary + カテゴリ別推移をPromise.allで並行取得
- Server Component（ReviewDataSection）でデータフェッチ、Client Component（ReviewClient）で描画

### aggregateCategoryTrend最適化
- 2段階クエリ: groupByでTOP Nカテゴリ決定 → 対象カテゴリのみfindMany
- 未分類カテゴリ（categoryId=null）をOR条件で適切に取得

## Codexレビュー指摘と対応

### Round 1（3件指摘）
1. TOP5横棒グラフのCell色未反映 → Cell子要素追加で修正
2. MonthSelector basePath="/" デフォルトが事故りやすい → usePathname()フォールバックに変更
3. aggregateCategoryTrendの全件取得パフォーマンス → 2段階クエリに最適化

### Round 2（1件指摘）
4. 未分類カテゴリ（categoryId=null）がTOP Nから除外される → null対応とOR条件クエリ追加

### Round 3（1件指摘）
5. 未分類テストのmock検証が不十分 → findMany呼び出し引数のOR条件アサーション追加

### Round 4
- 全指摘解消、承認取得

## テスト結果
- 193件全パス（+5件新規追加）
- lint 0エラー
- typecheck: e2e既存エラーのみ（今回対象外）

## 将来の課題
- Claude AI洞察カード実装（Phase4）
- カテゴリ別推移のインタラクション強化（タップで月別詳細表示等）
