"use client"

import { useActionState, useEffect, useRef } from "react"
import { Home } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { loginAction, type LoginState } from "../actions"

const initialState: LoginState = { error: null, errorSeq: 0 }

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState)
  const emailRef = useRef<HTMLInputElement>(null)
  const isCredentialsError = state.errorType === "credentials"
  const hasError = Boolean(state.error)

  // 認証失敗時はメール入力欄にフォーカスを戻す（再入力しやすいように）
  // それ以外のエラーはaria-liveによるSR通知のみ
  useEffect(() => {
    if (!state.error) return
    if (isCredentialsError) {
      emailRef.current?.focus()
    }
  }, [state.errorSeq]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-dvh grid place-items-center bg-background px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Home className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">カケイシェア</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4" aria-busy={pending}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="taro@example.com"
                aria-invalid={isCredentialsError || undefined}
                aria-describedby={hasError ? "login-error" : undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                aria-invalid={isCredentialsError || undefined}
                aria-describedby={hasError ? "login-error" : undefined}
              />
            </div>

            <div aria-live="polite" aria-atomic="true">
              {state.error && (
                <p
                  id="login-error"
                  className="text-sm text-destructive"
                >
                  {state.error}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
