// NextAuth v5 型拡張
// Session.user に id と role を追加

import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "ADMIN" | "MEMBER"
    } & DefaultSession["user"]
  }

  interface User {
    role: "ADMIN" | "MEMBER"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: "ADMIN" | "MEMBER"
  }
}
