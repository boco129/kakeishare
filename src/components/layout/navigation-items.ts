import { Home, Receipt, ChartNoAxesCombined, Settings } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type NavigationItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavigationItem[] = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/expenses", label: "支出", icon: Receipt },
  { href: "/review", label: "レビュー", icon: ChartNoAxesCombined },
  { href: "/settings", label: "設定", icon: Settings },
]
