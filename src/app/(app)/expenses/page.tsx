import { auth } from "@/auth"
import { getDisplayName } from "@/lib/auth-utils"

export default async function ExpensesPage() {
  const session = await auth()

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">支出一覧</h1>

        <p className="text-muted-foreground">
          {getDisplayName(session)}さんの支出
        </p>

        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          支出管理は今後実装予定です
        </div>
      </div>
    </div>
  )
}
