import { auth } from "@/auth"

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">ホーム</h1>

        <p className="text-muted-foreground">
          ようこそ、{session?.user.name}さん
        </p>

        {/* ダッシュボードコンテンツは今後実装 */}
        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          ダッシュボードは今後実装予定です
        </div>
      </div>
    </div>
  )
}
