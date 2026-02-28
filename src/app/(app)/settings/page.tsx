import { auth } from "@/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogoutButton } from "@/components/layout/logout-button"
import Link from "next/link"
import { ChevronRight, CreditCard, PiggyBank, Tags } from "lucide-react"

export default async function SettingsPage() {
  const session = await auth()

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">設定</h1>

        {/* アカウント情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">アカウント</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">名前</p>
              <p>{session?.user?.name ?? "未設定"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">メールアドレス</p>
              <p>{session?.user?.email ?? "未設定"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">権限</p>
              <p>
                {session?.user?.role === "ADMIN"
                  ? "管理者"
                  : session?.user?.role === "MEMBER"
                    ? "メンバー"
                    : "不明"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 予算設定 */}
        <Link href="/settings/budgets" id="budget" className="block">
          <Card className="transition-colors hover:bg-accent/50">
            <CardContent className="flex items-center gap-3 py-4">
              <PiggyBank className="size-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">予算設定</p>
                <p className="text-sm text-muted-foreground">
                  月間予算の設定・カテゴリ別予算管理
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        {/* 分割払い管理 */}
        <Link href="/settings/installments" id="installment" className="block">
          <Card className="transition-colors hover:bg-accent/50">
            <CardContent className="flex items-center gap-3 py-4">
              <CreditCard className="size-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">分割払い管理</p>
                <p className="text-sm text-muted-foreground">
                  分割払い・ローンの登録・進捗管理
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        {/* カテゴリ管理 */}
        <Link href="/settings/categories" className="block">
          <Card className="transition-colors hover:bg-accent/50">
            <CardContent className="flex items-center gap-3 py-4">
              <Tags className="size-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">カテゴリ管理</p>
                <p className="text-sm text-muted-foreground">
                  カテゴリの追加・編集・公開レベル設定
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        {/* モバイルではサイドバーにログアウトがないため表示 */}
        <div className="desktop:hidden">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
