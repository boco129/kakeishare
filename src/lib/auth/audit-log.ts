// 認証監査ログ
// HMAC-SHA256でIP・emailを匿名化した構造化ログを出力する

import { createHmac } from "crypto"

let _auditSecret: string | undefined

/** 監査ログ用シークレットを遅延取得する（ビルド時のモジュール評価で失敗しないように） */
function getAuditSecret(): string {
  if (_auditSecret) return _auditSecret
  const secret = process.env.AUTH_AUDIT_SECRET
  if (secret) {
    _auditSecret = secret
    return secret
  }
  if (process.env.NODE_ENV !== "production") {
    _auditSecret = "dev-audit-secret"
    return _auditSecret
  }
  throw new Error("AUTH_AUDIT_SECRET is required in production")
}

/** HMAC-SHA256で匿名化（先頭12文字） */
function anonymize(value: string): string {
  return createHmac("sha256", getAuditSecret())
    .update(value)
    .digest("hex")
    .slice(0, 12)
}

type AuthEventType =
  | "login_success"
  | "login_failure"
  | "rate_limit_blocked"

interface AuthEventData {
  ip?: string
  email?: string
  reason?: string
}

/** 認証イベントの監査ログを出力する */
export function logAuthEvent(event: AuthEventType, data: AuthEventData): void {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ip: data.ip ? anonymize(data.ip) : undefined,
    email: data.email ? anonymize(data.email.toLowerCase()) : undefined,
    reason: data.reason,
  }

  console.log(JSON.stringify(entry))
}
