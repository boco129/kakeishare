"use server"

import { AuthError } from "next-auth"
import { isRedirectError } from "next/dist/client/components/redirect-error"
import { signIn } from "@/auth"
import { safeRedirectPath } from "@/lib/auth/safe-redirect-path"

export type LoginState = { error: string | null }

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const callbackUrl = String(formData.get("callbackUrl") ?? "/")
  const redirectTo = safeRedirectPath(callbackUrl)

  try {
    await signIn("credentials", { email, password, redirectTo })
    return { error: null }
  } catch (e) {
    if (e instanceof AuthError && e.type === "CredentialsSignin") {
      return { error: "メールアドレスまたはパスワードが正しくありません。" }
    }
    // signIn 成功時のリダイレクトも Error として throw されるため再 throw
    if (isRedirectError(e)) {
      throw e
    }
    return { error: "ログインに失敗しました。時間をおいて再試行してください。" }
  }
}
