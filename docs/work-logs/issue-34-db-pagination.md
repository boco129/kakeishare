# Issue #34: 支出一覧APIの性能改善（DB側ページネーション対応）

## 対応日
2026-02-28

## ブランチ
`feature/issue-34-db-pagination` → `develop`

## 変更ファイル一覧
- `src/app/api/expenses/route.ts` — GET ハンドラをDB側ページネーションに書き換え
- `src/lib/privacy/constants.ts` — 新規: VISIBLE_TO_OTHERS 共有定数
- `src/lib/privacy/index.ts` — 定数の re-export 追加

## 実装詳細

### 変更前の問題
- `db.expense.findMany()` で全件取得
- アプリ側で `filterExpensesForUser()` → 再ソート → `slice()` でページネーション
- データ量増加でパフォーマンス劣化のリスク

### 変更後の設計（案A: 2段クエリ方式）
1. **baseWhere** — yearMonth / categoryId / userId の基本条件
2. **visibleWhere** — 自分の支出 OR 表示可能なvisibility（PUBLIC / AMOUNT_ONLY）
3. **categoryTotalWhere** — 相手のCATEGORY_TOTAL支出のみ（集計用）
4. `$transaction` で findMany / count / groupBy を並列実行
5. アプリ側で `filterExpenseForUser()` によるAMOUNT_ONLYマスク処理

### ポイント
- orderBy に `id` を第2キー追加（ページ跨ぎの重複・欠落防止）
- `VISIBLE_TO_OTHERS` 定数で WHERE とフィルタの visibility 判定を一元管理
- categoryTotals を `totalAmount desc` でソート（表示順の安定化）
- `filterUserId === userId` 時は groupBy をスキップ（不要なDB負荷を回避）

## レビュー指摘と対応（Codex）

### 第1回（設計レビュー）
1. ORDER BY の同値時に順序が不安定 → id を第2キーに追加
2. WHERE条件のズレリスク → baseWhere から派生させる形に
3. findMany / count / groupBy の整合性 → $transaction でまとめる

### 第2回（コードレビュー）
1. 中: visibility判定の分散リスク → VISIBLE_TO_OTHERS 定数化 + OR条件に変更
2. 低: categoryTotals の非決定的順序 → totalAmount desc + categoryName asc でソート
3. 低: 自分の支出フィルタ時の無駄なgroupBy → needsCategoryTotals フラグで条件分岐

### 最終レビュー
- 承認（Approve）。ブロッカーなし
- 非ブロッカー提案: VISIBLE_TO_OTHERS を共有定数に → 反映済み

## 将来の課題
- E2E テストでDB側ページネーションの回帰テスト追加
- 大量データでのパフォーマンス計測
- Phase 3 の月次集計テーブル導入時にクエリ最適化を再検討
