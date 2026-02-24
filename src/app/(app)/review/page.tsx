import { auth } from "@/auth"
import { getDisplayName } from "@/lib/auth-utils"

export default async function ReviewPage() {
  const session = await auth()

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">家計レビュー</h1>

        <p className="text-muted-foreground">
          {getDisplayName(session)}さんの家計レビュー
        </p>

        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          家計レビューは今後実装予定です
        </div>
      </div>
    </div>
  )
}
