/** 末尾スラッシュを正規化（ルートは除く） */
function normalize(path: string): string {
  return path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path
}

/** パス名がナビアイテムのhrefにマッチするか判定 */
export function isPathActive(pathname: string, href: string): boolean {
  const p = normalize(pathname)
  const h = normalize(href)
  if (h === "/") return p === "/"
  return p === h || p.startsWith(`${h}/`)
}
