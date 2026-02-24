import type { Session } from "next-auth"

/** セッションからユーザー表示名を取得（name → email → ゲスト の順でフォールバック） */
export function getDisplayName(session: Session | null): string {
  return session?.user?.name ?? session?.user?.email ?? "ゲスト"
}
