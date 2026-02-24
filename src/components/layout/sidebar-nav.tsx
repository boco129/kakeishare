"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "./navigation-items"
import { isPathActive } from "./navigation-utils"

export function SidebarNav({ footer }: { footer?: ReactNode }) {
  const pathname = usePathname()

  return (
    <aside className="hidden h-dvh w-60 flex-col border-r bg-card desktop:flex">
      <div className="border-b px-4 py-4 text-lg font-semibold">
        カケイシェア
      </div>
      <nav aria-label="メインナビゲーション" className="flex-1 px-2 py-2">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isPathActive(pathname, item.href)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      {footer && <div className="border-t p-3">{footer}</div>}
    </aside>
  )
}
