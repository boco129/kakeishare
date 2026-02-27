# Issue #25: GitHub Actions E2Eテスト失敗の修正

## 対応日
2026-02-28

## ブランチ
develop（直接コミット）

## 問題の概要
Issue #22〜#24 で追加した本番保護機能が、CIの `next start`（`NODE_ENV=production`）環境を考慮していなかったため、GitHub ActionsのE2Eテストが複数箇所で失敗していた。

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `prisma/seed-guard.ts` | ALLOWED_EXACT_PATHS に `e2e.db` を追加 |
| `src/lib/seed-guard.test.ts` | e2e.db許可のテストケースを追加 |
| `.github/workflows/e2e.yml` | AUTH_SECRET長修正、AUTH_AUDIT_SECRET追加、AUTH_URLをlocalhostに統一 |
| `src/lib/env-schema.ts` | CI環境（CI=true & AUTH_TRUST_HOST=true）でhttpsチェックを緩和 |
| `src/app/api/dev/reset-rate-limit/route.ts` | CI環境でもレート制限リセットAPIを動作させる |

## 実装詳細

### 1. seed-guard がCIのDBパスをブロック（コミット: 2e11e0f）
- **原因**: `ALLOWED_EXACT_PATHS` に `./prisma/dev.db` しか登録されておらず、CIの `file:./prisma/e2e.db` が拒否された
- **修正**: `path.resolve("./prisma/e2e.db")` を許可リストに追加
- **Codex相談結果**: 3案（allowlist追加 / --force / CI_ENV環境変数バイパス）のうち、案1が最もセキュリティ上安全と判断

### 2. AUTH_SECRET が32文字未満（コミット: 54b2465）
- **原因**: `${{ github.run_id }}-${{ github.run_attempt }}-e2e` が約18文字で、env-schemaの32文字バリデーションに引っかかった
- **修正**: プレフィックス・サフィックスを追加し常に32文字以上になるよう変更

### 3. AUTH_URL の https 必須チェック（コミット: bafcb7a）
- **原因**: `next start` は `NODE_ENV=production` で起動するため、`AUTH_URL=http://...` が本番チェックで拒否された
- **修正**: `env-schema.ts` で `CI=true && AUTH_TRUST_HOST=true` の場合はhttpsチェックをスキップ
- **Codex相談結果**: `NODE_ENV=test` 設定は `next start` が内部で `production` を強制するため効果なし。CI条件での緩和が最適

### 4. AUTH_AUDIT_SECRET 未設定（コミット: 54e0b8d）
- **原因**: `audit-log.ts` が `NODE_ENV=production` で `AUTH_AUDIT_SECRET` 環境変数を必須としていた
- **修正**: e2e.yml に `AUTH_AUDIT_SECRET` を追加

### 5. localhost vs 127.0.0.1 の不一致 & レート制限リセット（コミット: e83f1d8）
- **原因**: `AUTH_URL=http://127.0.0.1:3000` と Playwright の `baseURL: http://localhost:3000` が不一致でNextAuth のCSRF検証に影響。また `reset-rate-limit` APIが `NODE_ENV=production` で404を返していた
- **修正**: AUTH_URL を `http://localhost:3000` に統一。レート制限リセットAPIに `CI=true` チェックを追加

## 根本原因の分析

Issue #22（レート制限）、#23（環境変数バリデーション）、#24（seed-guard）の各機能は、ローカル開発（`NODE_ENV=development`）と本番（`NODE_ENV=production` on Vercel）の2環境を想定して設計されていた。しかしCIのE2Eテストでは `next start` が `NODE_ENV=production` で起動するため、「本番ではないがproductionモードで動作する第3の環境」が考慮されていなかった。

## 今後の教訓

1. **本番保護機能を追加する際は、CIのE2Eテスト環境（`next start` = `NODE_ENV=production`）も考慮すること**
2. **CI固有の環境変数（`CI=true`, `AUTH_TRUST_HOST=true`）を条件に使うことで、本番ガードを維持しつつCIを通す設計が有効**
3. **環境変数のバリデーションを追加した場合、e2e.ymlの環境変数も同時に更新すること**
4. **Playwright の `baseURL` と NextAuth の `AUTH_URL` は必ず一致させること**
