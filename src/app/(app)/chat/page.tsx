import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { isAIAvailable } from "@/lib/ai"
import { env } from "@/lib/env"
import { ChatClient } from "@/components/chat/ChatClient"

/** 現在の YYYY-MM を返す */
function getCurrentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export default async function ChatPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const yearMonth = getCurrentYearMonth()
  const aiAvailable = isAIAvailable(env)

  return (
    <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] flex-col">
      <ChatClient yearMonth={yearMonth} aiAvailable={aiAvailable} />
    </div>
  )
}
