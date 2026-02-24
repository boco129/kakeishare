import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Home } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">カケイシェア</h1>
          </div>
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            設定
          </Link>
        </div>

        <p className="text-muted-foreground">
          ようこそ、{session.user.name}さん
        </p>

        {/* ダッシュボードコンテンツは今後実装 */}
        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          ダッシュボードは今後実装予定です
        </div>
      </div>
    </main>
  )
}
