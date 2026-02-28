# Issue #40: Recharts + shadcn/ui chart 基盤導入

## 対応日
2026-02-28

## ブランチ
`feature/issue-40-recharts-chart-base` → `develop`

## 作成・変更ファイル

| ファイル | 内容 |
|---------|------|
| `package.json` | recharts, react-is 追加 |
| `src/components/ui/chart.tsx` | shadcn/ui Chart コンポーネント（`pnpm dlx shadcn add chart`） |
| `src/lib/chart-format.ts` | formatJPY（Intl.NumberFormat）, formatPercent |
| `src/lib/chart-colors.ts` | CHART_COLORS配列, colorByCategoryKey（ハッシュベース安定色割当） |
| `src/components/charts/CategoryPieChart.tsx` | カテゴリ別ドーナツチャート |
| `src/components/charts/MonthlyBarChart.tsx` | 月次推移棒グラフ + 予算ライン（ReferenceLine） |
| `src/components/charts/BudgetProgressBar.tsx` | 予算消化プログレスバー（CSS/Tailwind実装） |
| `src/components/charts/CoupleRatioChart.tsx` | 夫婦比率スタック棒グラフ |
| `src/components/charts/index.ts` | バレルエクスポート |
| `src/lib/chart-format.test.ts` | フォーマッタのユニットテスト |
| `src/lib/chart-colors.test.ts` | 色割当のユニットテスト |

## 実装詳細

### パッケージ
- `recharts` 3.7.0 — チャートライブラリ
- `react-is` 19.2.4 — React 19環境でのRecharts互換性確保
- shadcn/ui chart — ChartContainer, ChartTooltip, ChartLegend等のラッパー

### チャートコンポーネント

| コンポーネント | データ型 | 描画方式 | 高さ |
|--------------|---------|---------|------|
| CategoryPieChart | CategoryBreakdown[] | Recharts PieChart（ドーナツ） | 220/260px |
| MonthlyBarChart | MonthlyTrend[] | Recharts BarChart + ReferenceLine | 240/300px |
| BudgetProgressBar | BudgetSummary | CSS/Tailwind プログレスバー | auto |
| CoupleRatioChart | CoupleRatio | Recharts 水平StackedBarChart | 80px |

### 設計方針
- 全コンポーネント `"use client"` — Rechartsがクライアントサイド必須
- shadcn `ChartContainer` が `ResponsiveContainer` を内包 — 親divの高さで制御
- カテゴリ色はハッシュベースで安定割当（月を跨いでも同カテゴリ同色）
- BudgetProgressBarはRecharts不使用（Codex推奨、CSS/Tailwindで軽量実装）
- 予算消化率に応じた3段階色（primary/amber/destructive）
- アクセシビリティ: role=progressbar + aria属性
- 空データ時は「データがありません」表示

### ユニットテスト
- formatJPY: 正数・0・大数・負数のフォーマット確認（4テスト）
- formatPercent: 整数・小数四捨五入・0・100%（4テスト）
- colorByCategoryKey: 同一キー安定性・CHART_COLORS範囲・null/undefined正規化（5テスト）

## Codexレビュー指摘と対応

### 第1ラウンド
1. **重大**: budgetLine propが未使用 → ReferenceLine描画を実装
2. **高**: CategoryPieChart凡例キー不整合 → nameKey="categoryKey"に修正
3. **中**: formatMonthがNaN対策なし → フェイルセーフ追加
4. **中**: BudgetProgressBarにアクセシビリティ属性なし → role/aria追加
5. **中**: コンポーネントRTLテスト不足 → 基盤導入スコープ外、#41以降で対応

### 第2ラウンド
- 承認（LGTM）

## 将来の課題

- コンポーネントRTLテスト追加（空データ分岐、色クラス閾値等）
- ダッシュボード画面（#41）でのチャート統合
- ダークモード対応の確認
- カテゴリ数が5を超えた場合の色の循環・重複対策
