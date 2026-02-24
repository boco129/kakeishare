import type { ReactNode } from "react"
import { SidebarNav } from "./sidebar-nav"
import { BottomTabBar } from "./bottom-tab-bar"
import { LogoutButton } from "./logout-button"

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="desktop:grid desktop:min-h-dvh desktop:grid-cols-[15rem_1fr]">
      <SidebarNav footer={<LogoutButton />} />
      <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] desktop:pb-0">
        {children}
      </main>
      <BottomTabBar />
    </div>
  )
}
