import { auth } from "@/auth"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { InstallmentManager } from "@/components/settings/installment-manager"

export default async function InstallmentsPage() {
  const session = await auth()
  const currentUserId = session?.user?.id ?? ""

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            設定
          </Link>
        </div>
        <h1 className="text-2xl font-bold">分割払い管理</h1>

        <InstallmentManager currentUserId={currentUserId} />
      </div>
    </div>
  )
}
