import { signOut } from "@/auth"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server"
        await signOut({ redirectTo: "/login" })
      }}
    >
      <Button type="submit" variant="outline" className="w-full gap-2">
        <LogOut className="h-4 w-4" />
        ログアウト
      </Button>
    </form>
  )
}
