# Issue #23: 環境変数の起動時バリデーション（Zod）を導入

## 対応日
2026-02-27

## ブランチ
`feature/issue-23-env-validation` → `develop` にマージ済み

## 作成・変更ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `src/lib/env-schema.ts` | Zodスキーマ定義とvalidateEnv関数 |
| `src/lib/env.ts` | モジュール評価時にバリデーション実行、envをexport |
| `src/lib/env.test.ts` | 20テストケース |
| `instrumentation.ts` | Next.js起動時にサーバーサイドでバリデーション実行 |

### 変更
| ファイル | 内容 |
|---------|------|
| `src/lib/db.ts` | `env.DATABASE_URL`経由に変更 |
| `src/auth.ts` | `env.AUTH_SECRET`経由に変更 |
| `middleware.ts` | fail-fast（未設定時throw）追加 |
| `.env.example` | 制約コメント追記 |

## 実装詳細

### 環境変数バリデーション
- **DATABASE_URL**: 必須、`file:` プレフィックス + パス必須（`/^file:.+/`）
- **AUTH_SECRET**: 必須、32文字以上、前後空白拒否、プレースホルダー部分一致検知
- **AUTH_URL**: 必須、URL形式、本番環境ではhttps強制（ビルドフェーズは除外）
- **フォールバック**: `NEXTAUTH_SECRET` → `AUTH_SECRET`、`NEXTAUTH_URL` → `AUTH_URL`

### ファイル分離設計
- `env-schema.ts`: 純粋関数（副作用なし）— テストから安全にimport可能
- `env.ts`: モジュール評価時に`validateEnv()`実行 — fail-fast保証
- `instrumentation.ts`: Next.js起動時に`env`をimportして確実にバリデーション

### middleware.tsの扱い
- Edge Runtimeで動作するためZod依存の`env.ts`をimportできない
- `process.env`直参照を維持し、`!authSecret`時のfail-fastを追加
- AUTH_SECRETにtransform(trim)を使わず、前後空白を「拒否」することで正規化不一致を防止

## Codexレビュー指摘と対応

### 第1回レビュー
| 重要度 | 指摘 | 対応 |
|--------|------|------|
| High | プレースホルダー検知がSet完全一致でバイパス可能 | 配列の部分一致（includes）に変更 |
| Medium | middleware.tsでsecret未設定時のfail-fastなし | throw Error追加 |
| Medium | AUTH_URLが本番でもhttp許容 | production時https強制（ビルドフェーズ除外） |
| Low | DATABASE_URLの`file:`のみで非空パスチェックなし | `/^file:.+/`正規表現に変更 |

### 第2回レビュー
| 重要度 | 指摘 | 対応 |
|--------|------|------|
| High | AUTH_SECRETのtrim正規化でauth.tsとmiddleware.tsの値が不一致になる | trimを廃止、前後空白は拒否に変更 |

### 第3回レビュー
- **承認**: 全指摘解消を確認

## テスト結果
- 全66テストパス（env.test.ts: 20テスト）
- ビルド成功

## 将来の課題
- PostgreSQL対応時にDATABASE_URLの`postgresql://`許可を追加
- AUTH_AUDIT_SECRETのバリデーション追加（本番で使用時）
- Vercelデプロイ時の環境変数設定ドキュメント整備
