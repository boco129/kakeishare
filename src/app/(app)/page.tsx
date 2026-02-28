import { Suspense } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { MonthSelector } from "@/components/dashboard/MonthSelector"
import { DashboardDataSection } from "@/components/dashboard/DashboardDataSection"
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton"

/** 現在の YYYY-MM を返す */
function getCurrentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/** yearMonth パラメータのバリデーション */
function validateYearMonth(value: string | undefined): string {
  if (!value) return getCurrentYearMonth()
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value
  return getCurrentYearMonth()
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ yearMonth?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const params = await searchParams
  const yearMonth = validateYearMonth(params.yearMonth)

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <MonthSelector yearMonth={yearMonth} />
        <Suspense key={yearMonth} fallback={<DashboardSkeleton />}>
          <DashboardDataSection yearMonth={yearMonth} userId={session.user.id} />
        </Suspense>
      </div>
    </div>
  )
}
