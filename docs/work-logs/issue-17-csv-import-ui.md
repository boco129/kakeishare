# Issue #17: CSV取り込みUI + 履歴・ステータス管理

## 対応日
2026-02-25

## ブランチ
`feature/issue-17-csv-import-ui`（develop から分岐）

## 作成・変更ファイル一覧

### 新規作成
| ファイル | 説明 |
|---------|------|
| `src/lib/csv/import-service.ts` | CSV取り込み共通サービス（preview/import共通ロジック） |
| `src/lib/csv/card-owners.ts` | カード所有者定義（status API/widgetで共有） |
| `src/app/api/csv-import/preview/route.ts` | POST /api/csv-import/preview — CSVプレビューAPI |
| `src/app/api/csv-import/history/route.ts` | GET /api/csv-import/history — 取り込み履歴API |
| `src/app/api/csv-import/status/route.ts` | GET /api/csv-import/status — 取り込みステータスAPI |
| `src/components/csv/csv-import-dialog.tsx` | CSV取り込みダイアログ（3ステップUI） |
| `src/components/csv/csv-import-history.tsx` | CSV取り込み履歴コンポーネント |
| `src/components/csv/csv-import-status.tsx` | ダッシュボード用ステータスウィジェット（Server Component） |
| `prisma/migrations/20260225094217_add_card_type_to_csv_import/` | cardTypeカラム追加マイグレーション |

### 変更
| ファイル | 変更内容 |
|---------|----------|
| `prisma/schema.prisma` | CsvImportにcardTypeカラム・インデックス追加 |
| `prisma/seed.ts` | csvImportデータにcardType追加 |
| `src/app/api/csv-import/route.ts` | 共通サービス利用にリファクタ、P2002競合対応 |
| `src/app/(app)/page.tsx` | ダッシュボードにステータスウィジェット追加 |
| `src/components/expenses/expenses-page-client.tsx` | CSV取込ボタン・履歴セクション追加 |
| `src/lib/csv/index.ts` | 新規エクスポート追加 |
| `src/lib/validations/csv-import.ts` | ownerUserIdバリデーション修正（cuid→min(1)） |

## 実装詳細

### CSV取り込みダイアログ（3ステップ）
1. **メタ情報選択**: カード種別・所有者・対象年月を選択
2. **ファイルアップロード**: ドラッグ&ドロップ対応、ファイル選択後に自動プレビュー
3. **プレビュー兼実行確認**: パース結果表示、重複ハイライト、件数サマリー、実行ボタン

### 共通サービス化（import-service.ts）
- preview APIとimport APIで共通のパース・重複検知ロジックを`analyzeCsvImport()`に抽出
- DB保存は行わず、分析結果を返却する設計

### APIエンドポイント
- `POST /api/csv-import/preview` — CSVパース・重複検知のみ（DB保存なし）
- `GET /api/csv-import/history` — 取り込み履歴一覧（ADMINは全件、MEMBERは自分分のみ）
- `GET /api/csv-import/status` — 今月の取り込みステータス（カード×ユーザー別）

### ダッシュボードステータスウィジェット
- Server Componentとして実装（クライアントfetch不要）
- 各カード×ユーザーの取り込み状況を表示
- 未取り込みカードがある場合にアラート表示

## Codexレビュー指摘と対応

| 指摘 | 対応 |
|------|------|
| ownerUserIdのcuid()バリデーションがseedと不整合 | min(1)に変更 |
| 履歴APIが全ユーザー分を返し権限制御不足 | ADMIN/MEMBER権限分岐を追加 |
| limit負数許容でPrismaエラー500化 | 下限クランプ追加 |
| limit未指定時にデフォルト1件になるバグ | Number(null)=0対策でNaN判定に変更 |
| 同一ファイル重複チェックの競合条件 | P2002をキャッチして409返却 |
| CARD_OWNERSが2箇所に重複ハードコード | card-owners.tsに集約 |
| モバイル表示でプレビュー表が崩れやすい | overflow-auto + min-w対応 |
| APIレスポンスの型安全性 | 将来のリファクタ対象として保留（既存パターンに合わせる） |
| コンポーネント分割不足 | 現規模では1ファイル維持、機能追加時に分割検討 |

## マージ時の追加修正（2026-02-26）

### マイグレーションSQL修正（Codexレビュー指摘）
- **問題**: `INSERT INTO new_csv_imports` に `cardType` カラムが含まれておらず、既存データがある環境でマイグレーションが失敗する
- **修正**: `cardName` から CASE 式で `cardType` を導出する INSERT に変更
- **Codex指摘対応**:
  - `ELSE 'unknown'` → `ELSE NULL` に変更（fail-fast、不正データの恒久化防止）
  - `UPPER()` 追加（SQLite/PostgreSQL間の LIKE case-sensitivity 差を吸収）
  - PostgreSQL非互換（PRAGMA構文）は現時点SQLite開発環境のみのため許容

## 将来の課題
- APIレスポンスの型安全性向上（zod検証 or 共通型定義）
- csv-import-dialog.tsxのコンポーネント分割（MetaStep/UploadStep/PreviewStep + hooks化）
- CARD_OWNERS定義のDB管理化（カード追加をUI経由で可能に）
- unconfirmedCountの動的更新（支出確認時のcsvImportレコード更新）
