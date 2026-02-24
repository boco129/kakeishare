import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { AppShell } from "@/components/layout/app-shell"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return <AppShell>{children}</AppShell>
}
