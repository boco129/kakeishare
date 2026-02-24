import { auth } from "@/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CategoryList } from "@/components/settings/category-list"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function CategoriesPage() {
  const session = await auth()
  const userId = session?.user?.id
  const isAdmin = session?.user?.role === "ADMIN"

  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      visibilitySettings: {
        where: { userId: userId ?? "" },
      },
    },
  })

  const initialCategories = categories.map((cat) => {
    const userSetting = cat.visibilitySettings[0]
    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      isFixedCost: cat.isFixedCost,
      defaultVisibility: cat.defaultVisibility,
      userVisibility: userSetting?.visibility ?? cat.defaultVisibility,
      sortOrder: cat.sortOrder,
    }
  })

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
        <h1 className="text-2xl font-bold">カテゴリ管理</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">カテゴリ一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryList
              initialCategories={initialCategories}
              isAdmin={isAdmin}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
