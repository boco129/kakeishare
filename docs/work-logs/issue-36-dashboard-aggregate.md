# Issue #36: ダッシュボード集計ドメイン層の実装

## 対応日
2026-02-28

## ブランチ
`feature/issue-36-dashboard-aggregate` → `develop`

## 作成ファイル

| ファイル | 内容 |
|---------|------|
| `src/lib/dashboard/types.ts` | 集計結果の型定義（11型） |
| `src/lib/dashboard/aggregate.ts` | 集計関数群（7関数 + 2ユーティリティ） |
| `src/lib/dashboard/index.ts` | バレルエクスポート |
| `src/lib/dashboard/aggregate.test.ts` | ユニットテスト（22テスト） |

## 実装詳細

### 集計関数一覧

| 関数 | 概要 |
|------|------|
| `toMonthRange` | YYYY-MM → 月初〜翌月初の Date 範囲変換 |
| `getPastMonths` | 基準月から N ヶ月分の YYYY-MM 配列（降順） |
| `aggregateMonthlyExpenses` | 月次支出合計（全visibility含む） |
| `aggregateByCategoryForMonth` | カテゴリ別支出集計（割合・件数付き） |
| `calcCoupleRatio` | 夫婦支出比率（全visibility含む） |
| `aggregateMonthlyTrend` | 直近 N ヶ月の月次推移 |
| `getBudgetSummary` | 予算 vs 実績サマリー |
| `getInstallmentSummary` | 分割払いサマリー（プライバシー処理付き） |
| `getCsvImportStatus` | CSV取込ステータス（CARD_OWNERSベース完全性チェック） |

### 設計方針

- **集計は全visibilityを含む**: 家計全体の正確な集計のため、CATEGORY_TOTALを含む全支出を集計対象とする
- **プライバシーは明細表示層の責務**: 集計ドメイン層では金額集計のみ行い、個別明細のフィルタリングはAPIルート層で行う
- **分割払いのプライバシー**: 自分=全表示、PUBLIC=全表示、AMOUNT_ONLY=descriptionマスク、CATEGORY_TOTAL=items除外（集計のみ反映）

### テスト

- 22テスト全件PASS
- Prisma DBモックでユニットテスト（`vi.mock("@/lib/db")`）
- エッジケース: 支出0の月、null categoryId、片方のみ支出あり、months<=0、負数金額

## Codexレビュー指摘と対応

### 第1ラウンド
1. **getCsvImportStatus**: `imports.length > 0` だけでは不十分 → `CARD_OWNERS.every()` による全カード完全性チェックに修正
2. **aggregateMonthlyTrend**: `months <= 0` でクラッシュ → 早期リターンガード追加

### 第2ラウンド
- 承認（問題なし）

## 将来の課題

- APIルート層での集計関数呼び出し（Issue #37以降）
- Rechartsによるグラフ表示連携（Phase 3後半）
- カテゴリ別予算の増減アラート機能
