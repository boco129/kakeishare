# Issue #32: 支出API CRUD + プライバシーフィルタの E2E テスト追加

## 対応日
2026-02-28

## ブランチ
`feature/issue-32-expense-api-e2e-tests`

## 作成・変更ファイル一覧

### 新規作成
- `e2e/expense-api.spec.ts` — 支出API E2E テスト（18テストケース）

### 変更
- `e2e/auth.setup.ts` — member（花子）ユーザーの storageState 保存を追加
- `playwright.config.ts` — api 専用プロジェクト追加、UI系プロジェクトに testIgnore 追加

## 実装詳細

### テストケース構成（18テスト）

#### 認可制御（2テスト）
- 未認証リクエスト → 全HTTPメソッド（GET/POST/PATCH/DELETE）で 401
- 認証済みで一覧取得 → 200

#### CRUD操作（3テスト）
- 支出の作成→取得→更新→削除のライフサイクル（test.step で統合）
- 存在しない支出の更新 → 404
- 存在しない支出の削除 → 404

#### 入力バリデーション（3テスト）
- amount=0 → 400 VALIDATION_ERROR
- actualAmount > amount → 400 VALIDATION_ERROR
- 不正な categoryId → 400 VALIDATION_ERROR

#### プライバシーフィルタ（6テスト）
- PUBLIC支出 → 全フィールド返却（masked: false）
- AMOUNT_ONLY支出 → description「個人支出」置換、memo/isSubstitute/actualAmount マスク
- AMOUNT_ONLY立替支出 → 立替情報もマスク
- CATEGORY_TOTAL支出 → 個別取得で 404
- CATEGORY_TOTAL支出 → 一覧のitemsに含まれず categoryTotals に集計
- CATEGORY_TOTAL支出 → 所有者本人は個別取得で 200

#### 所有者制御（4テスト）
- 自分の支出の更新 → 成功
- 他人の支出の更新 → 403
- 自分の支出の削除 → 成功
- 他人の支出の削除 → 403

### 設計方針
- **api専用プロジェクト**: mobile/desktop での二重実行を回避
- **test.step**: CRUD ライフサイクルを1テスト内に統合（serial より安定）
- **ヘルパー関数**: `expectApiError`（エラーコード検証）、`withMemberRequest`（花子用コンテキスト管理）
- **baseURL動的取得**: `getBaseURL(testInfo)` でハードコード排除
- **テストデータ管理**: CRUDテストは作成→削除でクリーンアップ、プライバシーテストはシードデータ活用

## レビュー指摘と対応

### Codex レビュー（1回目）
| 重要度 | 指摘 | 対応 |
|--------|------|------|
| High | 削除検証が偽陽性（createdId=null後にfallback値で検証） | deletedId変数を導入し実IDで404検証 |
| Medium | エラー系アサーションがHTTPステータスのみ | expectApiErrorヘルパーでok=false + error.code検証 |
| Medium | バリデーション系テスト不足 | amount=0、actualAmount>amount、不正categoryIdの3テスト追加 |
| Low | 重複コード（member用コンテキスト生成） | withMemberRequestヘルパーで共通化 |
| Low | setupでURLハードコード | testInfo.project.use.baseURLで動的取得 |

### Codex レビュー（2回目）
| 重要度 | 指摘 | 対応 |
|--------|------|------|
| Low | withMemberRequest内のbaseURLハードコード | getBaseURL(testInfo)をパラメータで渡す形に変更 |

### Codex 最終レビュー → LGTM

## 将来の課題
- PATCHでカテゴリ変更時のvisibility自動再解決のE2Eテスト追加
- ページネーション・ソートのE2Eテスト追加
