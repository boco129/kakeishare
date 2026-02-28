# Issue #41 ダッシュボード画面実装 対応ログ

## 対応日
2026-02-28

## ブランチ
`feature/issue-41-dashboard-ui`

## 作成・変更ファイル一覧

### 新規作成
| ファイル | 説明 |
|---------|------|
| `src/components/dashboard/MonthSelector.tsx` | 月切替ナビゲーション（年月表示対応） |
| `src/components/dashboard/BudgetCard.tsx` | 予算残高カード + 未設定時CTA |
| `src/components/dashboard/MonthlySummaryCard.tsx` | 今月支出・前月比 2カラムカード |
| `src/components/dashboard/AlertSection.tsx` | CSV未取込・未確認・予算超過アラート |
| `src/components/dashboard/InstallmentSummaryCard.tsx` | 分割払いサマリー + 残債合計・詳細リンク |
| `src/components/dashboard/DashboardClient.tsx` | クライアントコンポーネント（全セクション統合） |
| `src/components/dashboard/DashboardDataSection.tsx` | Server Component（データフェッチ + Suspense境界） |
| `src/components/dashboard/DashboardSkeleton.tsx` | ローディングスケルトン（チャート別高さ対応） |
| `src/lib/dashboard/get-dashboard-summary.ts` | 7集計クエリの並列オーケストレータ |

### 変更
| ファイル | 変更内容 |
|---------|---------|
| `src/app/(app)/page.tsx` | Server Component化、Suspense + MonthSelector統合 |
| `src/app/api/dashboard/summary/route.ts` | getDashboardSummaryに委譲するよう簡略化 |
| `src/components/charts/BudgetProgressBar.tsx` | 色閾値を4段階に変更（設計書準拠） |
| `src/lib/dashboard/types.ts` | InstallmentSummaryにtotalRemainingAmount追加 |
| `src/lib/dashboard/aggregate.ts` | totalRemainingAmount集計追加 |
| `src/lib/dashboard/aggregate.test.ts` | totalRemainingAmountのテスト期待値追加 |
| `src/lib/dashboard/index.ts` | getDashboardSummaryエクスポート追加 |

## 実装詳細

### アーキテクチャ
- **Server Component / Client Component分離**: `page.tsx`（Server）→ `DashboardDataSection`（Server、データフェッチ）→ `DashboardClient`（Client、レンダリング）
- **Suspense境界**: `key={yearMonth}`で月切替時にリマウント、スケルトン表示
- **並列データフェッチ**: `Promise.all`で7集計クエリを同時実行

### 画面設計書準拠の修正（Codexレビュー反映）
1. **BudgetProgressBar**: 3段階→4段階色閾値（0-60% blue, 60-80% yellow, 80-100% orange, 100%+ red）
2. **BudgetCard**: 予算未設定時CTA追加（`/settings#budget`へリンク）
3. **InstallmentSummaryCard**: 残債合計表示 + 「詳細→」リンク（`/settings#installment`）
4. **DashboardSkeleton**: チャート別高さ調整（CategoryPie=220px, CoupleRatio=80px, MonthlyBar=240px）
5. **MonthSelector**: 「2月の家計」→「2026年2月の家計」に年表示追加

### テスト
- 全188テストパス（うちaggregate.test.ts 22テスト）
- totalRemainingAmountの期待値検証を3ケースに追加

## レビュー指摘と対応

### Codex初回レビュー
| 指摘 | 重要度 | 対応 |
|------|--------|------|
| CTAの遷移先が`/settings`で設計書の遷移意図と不一致 | 中 | `#budget` / `#installment` アンカー追加 |
| totalRemainingAmountのテスト期待値が未検証 | 低 | 3テストケースに`expect`追加 |

### Codex再レビュー
- 指摘なし、最終承認済み

## 将来の課題
- `/settings` ページに `#budget` / `#installment` セクション（アンカー先）の実装が必要
- 予算設定UI（Issue #42）、分割払い管理UI（Issue #43）との連携
