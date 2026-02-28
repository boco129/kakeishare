# Issue #39: ダッシュボード集計API（Dashboard Summary API）

## 対応日
2026-02-28

## ブランチ
`feature/issue-39-dashboard-summary-api` → `develop`

## 作成・変更ファイル

| ファイル | 内容 |
|---------|------|
| `src/lib/validations/dashboard.ts` | クエリスキーマ（yearMonth + months with preprocess） |
| `src/lib/validations/index.ts` | バレルエクスポート更新 |
| `src/app/api/dashboard/summary/route.ts` | GET APIハンドラー（7集計をPromise.allで並列呼出し） |
| `e2e/dashboard-summary-api.spec.ts` | E2Eテスト |

## 実装詳細

### API エンドポイント

| メソッド | パス | 権限 | 概要 |
|---------|------|------|------|
| GET | `/api/dashboard/summary?yearMonth=YYYY-MM&months=6` | 認証済み | ダッシュボードサマリー取得 |

### レスポンス構造

| セクション | 集計関数 | 概要 |
|-----------|---------|------|
| `monthly` | `aggregateMonthlyExpenses` | 月次支出合計・件数 |
| `categories` | `aggregateByCategoryForMonth` | カテゴリ別集計（金額・割合・件数） |
| `coupleRatio` | `calcCoupleRatio` | 夫婦支出比率 |
| `trend` | `aggregateMonthlyTrend` | 月次トレンド（デフォルト6ヶ月） |
| `budget` | `getBudgetSummary` | 予算vs実績 |
| `installment` | `getInstallmentSummary` | 分割払いサマリー（プライバシーフィルタ適用） |
| `csvImport` | `getCsvImportStatus` | CSV取込状況 |

### 設計方針

- **並列実行**: 7つの集計関数をPromise.allで並列呼出し
- **バリデーション**: yearMonth必須（YYYY-MM形式）、months 1-24（デフォルト6）
- **months null問題**: `z.preprocess`でURLSearchParams.get()のnull/空文字をundefinedに変換しdefault(6)を正常動作
- **プライバシー**: 集計関数側で適用（installmentのAMOUNT_ONLYマスク等）
- **エラー方針**: Promise.all fail-fast（1つ失敗で500統一、将来的にallSettled+degraded検討）

### E2Eテスト

- 認可制御: 未認証→401、認証済み→200
- レスポンス構造: 全7セクション存在確認、カテゴリデータ検証
- クエリパラメータ: months=3/12/未指定(デフォルト6)、yearMonth不正→400、months範囲外→400
- プライバシー: 分割払いAMOUNT_ONLYマスク確認、自分のPUBLICは全表示

## Codexレビュー指摘と対応

### 第1ラウンド
1. **High**: months null→0変換でdefault(6)不動作 → z.preprocessで修正
2. **High**: マルチテナントスコープ未対応 → 現在は単一家計DB前提、コメント追加
3. **Medium**: Promise.all fail-fast → シンプルに500統一、コメントで将来方針記載
4. **Medium**: E2Eプライバシーテスト不足 → installmentマスク検証追加

### 第2ラウンド
1. **Medium**: if (maskedItem)ガードでテストスキップ → expect().toBeDefined()を先置き
2. **Low**: fail-fast方針コメント未記載 → route.tsに追加

### 第3ラウンド
- 承認（LGTM）

## 将来の課題

- マルチテナント化時のユーザー/世帯スコープフィルタ導入
- Promise.allSettled + degradedフラグによる部分障害許容
- ダッシュボードUIコンポーネントとの統合
