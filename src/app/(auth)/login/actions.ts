"use server"

import { headers } from "next/headers"
import { AuthError } from "next-auth"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { signIn } from "@/auth"
import { safeRedirectPath } from "@/lib/auth/safe-redirect-path"
import { peekRateLimit } from "@/lib/auth/rate-limiter"
import { logAuthEvent } from "@/lib/auth/audit-log"
import { extractIp } from "@/lib/auth/client-ip"

export type LoginState = {
  error: string | null
  errorType?: "credentials" | "rate_limit" | "system"
  errorSeq: number
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const callbackUrl = String(formData.get("callbackUrl") ?? "/")
  const redirectTo = safeRedirectPath(callbackUrl)

  const h = await headers()
  const ip = extractIp(h.get("x-forwarded-for"), h.get("x-real-ip"))

  // UX向上: ブロック状態を事前チェック（消費しない読み取り専用）
  // 実際の消費・制限はauthorize側で行うのでバイパス不可
  const rateLimit = peekRateLimit(ip, email)
  const nextSeq = _prev.errorSeq + 1

  if (!rateLimit.allowed) {
    logAuthEvent("rate_limit_blocked", { ip, email })
    const minutes = Math.ceil(rateLimit.retryAfterMs / 60000)
    return {
      error: `ログイン試行回数が制限を超えました。約${minutes}分後に再試行してください。`,
      errorType: "rate_limit",
      errorSeq: nextSeq,
    }
  }

  try {
    await signIn("credentials", { email, password, redirectTo })
    return { error: null, errorSeq: nextSeq }
  } catch (e) {
    if (e instanceof AuthError && e.type === "CredentialsSignin") {
      return {
        error: "メールアドレスまたはパスワードが正しくありません。",
        errorType: "credentials",
        errorSeq: nextSeq,
      }
    }
    // signIn 成功時のリダイレクトも Error として throw されるため再 throw
    if (isRedirectError(e)) {
      throw e
    }
    return {
      error: "ログインに失敗しました。時間をおいて再試行してください。",
      errorType: "system",
      errorSeq: nextSeq,
    }
  }
}
