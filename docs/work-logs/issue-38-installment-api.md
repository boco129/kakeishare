# Issue #38: 分割払いAPI CRUD（Installment API）

## 対応日
2026-02-28

## ブランチ
`feature/issue-38-installment-api` → `develop`

## 作成・変更ファイル

| ファイル | 内容 |
|---------|------|
| `src/app/api/installments/route.ts` | GET（一覧+プライバシー+ステータスフィルタ+集計）/ POST（新規登録） |
| `src/app/api/installments/[id]/route.ts` | GET（個別+プライバシー）/ PATCH（所有者のみ+整合性チェック）/ DELETE（所有者のみ） |
| `src/lib/validations/installment.ts` | remainingMonths optional化+補完、installmentStatusSchema追加 |
| `src/lib/validations/index.ts` | エクスポート更新 |
| `e2e/installment-api.spec.ts` | E2Eテスト |

## 実装詳細

### API エンドポイント

| メソッド | パス | 権限 | 概要 |
|---------|------|------|------|
| GET | `/api/installments?status=` | 認証済み | 一覧+プライバシーフィルタ+集計 |
| POST | `/api/installments` | 認証済み | 新規登録（自分のuserIdで作成） |
| GET | `/api/installments/:id` | 認証済み | 個別取得+プライバシー |
| PATCH | `/api/installments/:id` | 所有者のみ | 更新（既存値マージ整合性チェック） |
| DELETE | `/api/installments/:id` | 所有者のみ | 削除 |

### 設計方針

- **プライバシー3段階**: 自分=全表示、PUBLIC=全表示、AMOUNT_ONLY=descriptionマスク、CATEGORY_TOTAL=items除外（集計のみ反映）
- **ステータスフィルタ**: active（デフォルト）/completed/all — 全ステータスでプライバシーフィルタ適用
- **算出フィールド**: remainingAmount = monthlyAmount * remainingMonths, progressRate = (totalMonths - remainingMonths) / totalMonths * 100
- **remainingMonths補完**: POST時にremainingMonths省略でtotalMonthsを自動設定
- **PATCH整合性**: 既存値とマージ後のremainingMonths <= totalMonthsを検証

### E2Eテスト

- 認可制御: 未認証→401
- CRUD: 作成→取得→更新→削除、remainingMonths明示指定
- 所有者制御: 他人の更新/削除→403
- プライバシー: AMOUNT_ONLYマスク確認
- ステータス: active/completed/allフィルタ
- バリデーション: totalMonths=0、remainingMonths>totalMonths、負数amount、PATCH整合性

## Codexレビュー指摘と対応

### 第1ラウンド（実装方針相談）
1. **High**: PATCH整合性をZod superRefineだけに依存は不十分 → API層で既存値マージ後に検証
2. **Medium**: remainingMonths必須はUX不整合 → optional化+totalMonths補完
3. **Medium**: completedにプライバシー未適用は履歴漏えい → 全ステータスで適用

### 第2ラウンド
1. **Medium**: Playwright型importエラー → 削除
2. **Low**: withMemberRequest未使用 → 削除
3. **Low**: status=completedテスト不足 → 追加

### 第3ラウンド
- 承認（LGTM）

## 将来の課題

- 分割払い管理UI（Issue #43）との連携
- 分割払い完了時の通知機能
- 月次自動引き落とし処理（remainingMonths自動デクリメント）
