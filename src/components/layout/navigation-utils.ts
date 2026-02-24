/** パス名がナビアイテムのhrefにマッチするか判定 */
export function isPathActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}
