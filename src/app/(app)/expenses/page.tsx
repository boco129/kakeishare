import { auth } from "@/auth"
import { getDisplayName } from "@/lib/auth-utils"
import { ExpensesPageClient } from "@/components/expenses/expenses-page-client"

export default async function ExpensesPage() {
  const session = await auth()
  return <ExpensesPageClient userLabel={getDisplayName(session)} />
}
