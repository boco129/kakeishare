// クライアントIP抽出ユーティリティ
// Vercel/リバースプロキシ環境ではx-forwarded-forが設定される前提
// ヘッダー偽装リスクはプロキシ設定側で制御する

/** RequestオブジェクトからクライアントIPを取得する（authorize用） */
export function getClientIpFromRequest(request: Request): string {
  const headers = new Headers(request.headers)
  return extractIp(
    headers.get("x-forwarded-for"),
    headers.get("x-real-ip"),
  )
}

/** Next.js headers()からクライアントIPを取得する（Server Actions用） */
export function extractIp(
  xForwardedFor: string | null,
  xRealIp: string | null,
): string {
  const fromXff = xForwardedFor?.split(",")[0]?.trim()
  const fromReal = xRealIp?.trim()
  return fromXff || fromReal || "unknown"
}
