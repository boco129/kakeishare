# Issue #43 分割払い管理UI実装

## 対応日
2026-02-28

## ブランチ
`feature/issue-43-installment-management-ui`（develop から分岐）

## 作成・変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `src/app/(app)/settings/installments/page.tsx` | 分割払い管理ページ（Server Component） |
| `src/components/settings/installment-manager.tsx` | 分割払い管理UIコンポーネント（Client Component） |
| `src/lib/api/installments.ts` | クライアント側API呼び出し関数 |

### 変更
| ファイル | 内容 |
|---------|------|
| `src/app/(app)/settings/page.tsx` | 分割払い管理リンクカード追加（CreditCardアイコン） |
| `src/components/dashboard/InstallmentSummaryCard.tsx` | リンク先を `/settings#installment` → `/settings/installments` に修正 |

## 実装詳細

### 1. 分割払い管理ページ（Server Component）
- `settings/installments/page.tsx` でセッション取得、currentUserIdをクライアントに渡す
- 既存のbudgets/categoriesページと同じレイアウトパターン

### 2. InstallmentManager（Client Component）
- **サマリー表示**: 残債合計（赤字）、月々支払合計、非公開件数の注記
- **アクティブ一覧**: カード形式で表示（説明、ユーザー名、総額、月額×残回数、プログレスバー、残額、完済予定日）
- **完了済み折りたたみ**: useStateトグルで展開/収納
- **新規登録/編集**: Dialogフォーム（説明、総額、月額、分割回数、残回数、開始日、手数料、公開レベル）
- **削除**: 確認ダイアログ付き
- **権限制御**: 自分の分割払いのみ編集・削除ボタン表示

### 3. クライアント側API関数
- `listInstallments(status)` — 一覧取得（active/completed/all）
- `createInstallment(body)` — 新規作成
- `updateInstallment(id, body)` — 更新
- `removeInstallment(id)` — 削除

## Codexレビュー指摘と対応

### 第1回レビュー（4点指摘）
1. **[High] 完済予定日算出の誤り** — startDate + remainingMonths ではなく startDate + totalMonths - 1 で最終支払月を計算
   → UTCベースの算出ロジックに修正、totalMonthsを使用するよう変更
2. **[Medium] parseInt による小数通過** — `1.9` が `1` に丸められる問題
   → Number + Number.isInteger に変更し、整数のみ許可するバリデーションに強化
3. **[Medium] 日付のTZずれ** — `toISOString().slice(0,10)` でUTC日付になる
   → `toDateInputValue()` ヘルパーで文字列スライスに統一
4. **[Low] hiddenCount表示の不整合** — 見出し件数とサマリー件数の基準不一致
   → 見出しに「全体 X件」を含める表示に改善

### 第2回レビュー（1点残件）
1. **[Medium] 新規作成時の開始日デフォルトにTZずれ** — emptyForm の startDate が toISOString 使用
   → `todayLocalDate()` ヘルパー追加、openCreateForm で動的設定

### 第3回レビュー（最終承認）
- 全指摘事項の解消を確認、承認

## 将来の課題
- カード名（エポス/MUFG等）の表示: 現Installmentモデルにフィールドがないため別Issue
- E2Eテストの追加
- 完済時の通知機能
