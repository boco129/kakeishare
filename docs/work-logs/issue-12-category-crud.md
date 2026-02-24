# Issue #12: カテゴリ管理 CRUD API + UI 実装

## 対応日
2026-02-25

## ブランチ
`feature/issue-12-category-crud` (from `develop`)

## 作成ファイル一覧

### prisma/ — スキーマ・マイグレーション
| ファイル | 内容 |
|---------|------|
| `schema.prisma` (変更) | CategoryVisibilitySettingモデル追加、Expense/BudgetにonDelete: Restrict追加 |
| `seed.ts` (変更) | CategoryVisibilitySettingのシードデータ追加 |
| `migrations/20260224234156_add_category_visibility_settings/` | CVS追加マイグレーション |
| `migrations/20260224235213_restrict_category_delete/` | onDelete: Restrictマイグレーション |

### src/lib/validations/ — Zodスキーマ
| ファイル | 内容 |
|---------|------|
| `category.ts` (新規) | categoryCreate/Update/VisibilityUpdate/Reorderスキーマ |
| `index.ts` (変更) | カテゴリスキーマのre-export追加 |

### src/app/api/categories/ — APIルート
| ファイル | 内容 |
|---------|------|
| `route.ts` (新規) | GET(一覧) / POST(新規作成) |
| `[id]/route.ts` (新規) | PATCH(更新) / DELETE(削除・参照チェック) |
| `[id]/visibility/route.ts` (新規) | PUT(ユーザー別公開レベルupsert) |
| `reorder/route.ts` (新規) | PATCH(バッチ並び替え) |

### src/components/settings/ — UIコンポーネント
| ファイル | 内容 |
|---------|------|
| `category-list.tsx` (新規) | カテゴリ一覧・並び替え・公開レベル変更 |
| `category-form-dialog.tsx` (新規) | カテゴリ追加/編集ダイアログ |
| `category-delete-dialog.tsx` (新規) | 削除確認ダイアログ |

### src/app/(app)/settings/ — ページ
| ファイル | 内容 |
|---------|------|
| `page.tsx` (変更) | カテゴリ管理リンク追加 |
| `categories/page.tsx` (新規) | カテゴリ管理ページ（Server Component） |

## 実装詳細

### データモデル変更
- **CategoryVisibilitySetting** テーブル追加: ユーザーごとにカテゴリの公開レベルを設定可能に
  - 複合主キー: (userId, categoryId)
  - onDelete: Cascade（ユーザー/カテゴリ削除時に自動クリーン）
- Expense.category / Budget.category に **onDelete: Restrict** を追加
  - カテゴリ削除時にFK制約でDBレベルでも保護

### API設計
| エンドポイント | メソッド | 認可 | 説明 |
|-------------|--------|------|------|
| `/api/categories` | GET | 全ユーザー | 一覧取得（ユーザー別公開レベル含む） |
| `/api/categories` | POST | ADMINのみ | 新規作成（末尾に自動sortOrder） |
| `/api/categories/[id]` | PATCH | ADMINのみ | 部分更新（name/icon/isFixedCost/defaultVisibility） |
| `/api/categories/[id]` | DELETE | ADMINのみ | 削除（支出・予算参照時は409） |
| `/api/categories/[id]/visibility` | PUT | 全ユーザー | ユーザー別公開レベル設定（upsert） |
| `/api/categories/reorder` | PATCH | ADMINのみ | バッチ並び替え（全ID一致チェック） |

### UI構成
- `/settings` にカテゴリ管理へのリンクカード追加
- `/settings/categories` で一覧表示（Server Component → Client Component委譲）
- 楽観的更新 + エラー時ロールバック
- アクセシビリティ: aria-label, aria-pressed, role="alert"

## Codexレビュー指摘と対応

| # | 重要度 | 指摘 | 対応 |
|---|--------|------|------|
| 1 | High | `categoryReorderSchema`のcuid()がシードIDと不整合 | `z.string().min(1)`に変更 |
| 2 | High | DELETE時のFK制約がSET NULLで競合突破可能 | `onDelete: Restrict`追加 |
| 3 | Medium | 並び替えAPIでID重複・欠落を未検証 | 全カテゴリ一致チェック追加 |
| 4 | Medium | クライアント側のエラーハンドリング不足 | try/catch/finally + 楽観的更新 |
| 5 | Medium | PUTが部分更新、sortOrder責務重複 | PATCH化 + sortOrder除外 |
| 6 | Low | aria-label欠如、未使用変数 | a11y属性追加、変数削除 |

## 将来の課題
- カテゴリ削除時の「別カテゴリへの置換削除」機能（現在は参照ありで拒否のみ）
- ドラッグ&ドロップによる並び替えUI
- カテゴリ名のユニーク制約（現在は重複名を許容）
