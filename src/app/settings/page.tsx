import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogoutButton } from "@/components/layout/logout-button"

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-bold">設定</h1>

        {/* アカウント情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">アカウント</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">名前</p>
              <p>{session.user.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">メールアドレス</p>
              <p>{session.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">権限</p>
              <p>
                {session.user.role === "ADMIN"
                  ? "管理者"
                  : session.user.role === "MEMBER"
                    ? "メンバー"
                    : "不明"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ログアウト */}
        <LogoutButton />
      </div>
    </main>
  )
}
