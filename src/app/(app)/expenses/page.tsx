import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getDisplayName } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { ExpensesPageClient } from "@/components/expenses/expenses-page-client"

export default async function ExpensesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const currentUserId = session.user.id

  // ユーザーフィルタ用にユーザー一覧を取得
  const users = await db.user.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  })

  return (
    <ExpensesPageClient
      userLabel={getDisplayName(session)}
      currentUserId={currentUserId}
      users={users}
    />
  )
}
