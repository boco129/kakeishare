# Issue #22: Credentials認証のレート制限（IP + email）を実装

## 対応日
2026-02-27

## ブランチ
`feature/issue-22-rate-limit` → `develop`

## 作成ファイル
| ファイル | 内容 |
|---------|------|
| `src/lib/auth/rate-limiter.ts` | レート制限モジュール（Store抽象 + InMemory実装 + 3スコープ） |
| `src/lib/auth/rate-limiter.test.ts` | レート制限単体テスト（13件） |
| `src/lib/auth/audit-log.ts` | HMAC-SHA256監査ログ |
| `src/lib/auth/audit-log.test.ts` | 監査ログ単体テスト（4件） |
| `src/lib/auth/client-ip.ts` | クライアントIP抽出ユーティリティ |

## 変更ファイル
| ファイル | 変更内容 |
|---------|----------|
| `src/auth.ts` | authorize関数にレート制限チェック・監査ログ・IP取得を統合 |
| `src/app/(auth)/login/actions.ts` | peekRateLimitによるUXフィードバック追加 |

## 実装詳細

### レート制限設計
- **3スコープ制限**: IP（20回/15分→15分ブロック）、email（5回/15分→30分ブロック）、email+ip複合（7回/15分→15分ブロック）
- **スライディングウィンドウ方式**: タイムスタンプ配列でウィンドウ外を除去
- **Store抽象化**: `RateLimitStore`インターフェースで将来Redis/KV対応可能
- **消費と参照の分離**: `checkAndConsume`（消費あり）と`peek`（読み取り専用）

### 統合アーキテクチャ
- `authorize`関数（auth.ts）が**唯一の消費制御点**（APIバイパス不可）
- `loginAction`（actions.ts）は`peekRateLimit`でUXフィードバックのみ（二重消費防止）
- ログイン成功時はemail系カウンタをクリア（IPはクリアしない）

### 監査ログ
- HMAC-SHA256でIP・emailを匿名化（辞書逆引き耐性）
- 本番環境で`AUTH_AUDIT_SECRET`未設定時はエラーをthrow（遅延評価でビルド時は安全）
- JSON構造化ログ（`login_success`, `login_failure`, `rate_limit_blocked`）

### IP抽出
- `client-ip.ts`に共通化（`getClientIpFromRequest` + `extractIp`）
- 空文字ヘッダーの正規化対応

## Codexレビュー指摘と対応

### 第1回レビュー
| 重大度 | 指摘 | 対応 |
|--------|------|------|
| High | actions.tsとauth.tsで二重消費 | `peekRateLimit`（非消費チェック）を追加 |
| High | 監査ログ秘密鍵の本番フォールバック | production時はthrow、遅延評価で安全化 |
| Medium | IP抽出がヘッダー信頼境界を明確化していない | client-ip.tsに共通化 |

### 第2回レビュー
- LGTM取得
- 追加提案: `extractIp`の空文字ヘッダー正規化 → 反映済み

## テスト結果
- 全46テスト合格（新規17件: rate-limiter 13件 + audit-log 4件）
- ビルド成功

## 将来の課題
- 本番環境でのRedis/KV Store実装（Upstash Redis推奨）
- メモリリーク対策（長時間稼働時のMap肥大化防止、定期クリーンアップ）
- レート制限の閾値チューニング（実運用データに基づく調整）
- `AUTH_AUDIT_SECRET`環境変数のVercelデプロイ設定追加
