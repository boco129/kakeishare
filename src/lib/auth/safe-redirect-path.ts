// オープンリダイレクト防止: 相対パスのみ許可、// プロトコル相対URLを拒否
export function safeRedirectPath(raw: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/"
  try {
    const u = new URL(raw, "http://localhost")
    return `${u.pathname}${u.search}${u.hash}`
  } catch {
    return "/"
  }
}
