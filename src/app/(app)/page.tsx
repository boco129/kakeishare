import { auth } from "@/auth"
import { getDisplayName } from "@/lib/auth-utils"
import { CsvImportStatusWidget } from "@/components/csv/csv-import-status"

export default async function DashboardPage() {
  const session = await auth()

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>

        <p className="text-muted-foreground">
          ようこそ、{getDisplayName(session)}さん
        </p>

        {/* CSV取り込みステータス */}
        <div className="rounded-lg border p-4">
          <CsvImportStatusWidget />
        </div>

        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          その他のダッシュボード機能は今後実装予定です
        </div>
      </div>
    </div>
  )
}
