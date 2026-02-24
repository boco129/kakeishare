// API 認証チェックヘルパー

import { auth } from "@/auth"
import { ApiError } from "./errors"

/** セッションを検証し、userId と role を返す。未認証なら ApiError を throw */
export async function requireAuth() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    throw new ApiError("UNAUTHORIZED", "認証が必要です", 401)
  }
  return { userId, role: session.user.role }
}
