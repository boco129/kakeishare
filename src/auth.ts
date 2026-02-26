// NextAuth v5 (Auth.js) 設定
// Credentials プロバイダーによるメール+パスワード認証

import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import bcrypt from "bcryptjs"

import { db } from "@/lib/db"

// 型ガード: Prisma Role enum の値かどうか判定
const isAppRole = (v: unknown): v is "ADMIN" | "MEMBER" =>
  v === "ADMIN" || v === "MEMBER"

const credentialsSchema = z.object({
  email: z.string().trim().email().transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(72),
})

// タイミング攻撃対策: ユーザーが存在しない場合でもbcrypt.compareを実行する
const DUMMY_PASSWORD_HASH =
  "$2a$12$C6UzMDM.H6dfI/f/IKxGhuY2L6nL6Nq35p3xNmPR9UCeFVLtZLk6a"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
          },
        })

        if (!user) {
          // タイミング差を減らすためダミー照合
          await bcrypt.compare(password, DUMMY_PASSWORD_HASH)
          return null
        }

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // 初回ログイン時にユーザー情報をtokenに格納
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      // tokenからsessionにユーザー情報を転写
      if (!session.user) return session

      if (typeof token.id === "string") {
        session.user.id = token.id
      }
      if (isAppRole(token.role)) {
        session.user.role = token.role
      }
      return session
    },
  },

  pages: {
    signIn: "/login",
  },
})
