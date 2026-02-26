// ルート保護ミドルウェア
// Edge Runtime で動作するため、Prisma を使わず JWT トークンで判定
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: authSecret })
  const { pathname } = request.nextUrl
  const isLoggedIn = !!token

  // ログイン済みユーザーが /login にアクセスした場合はダッシュボードへ
  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // 未認証ユーザーは /login へリダイレクト
  if (!isLoggedIn && pathname !== "/login") {
    const loginUrl = new URL("/login", request.url)
    // query パラメータも保持してリダイレクト後に復元（hash はサーバー側で取得不可）
    const callback = `${pathname}${request.nextUrl.search}`
    loginUrl.searchParams.set("callbackUrl", callback)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  // 公開リソース以外を基本保護（将来のルート追加漏れ防止）
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico).*)",
  ],
}
