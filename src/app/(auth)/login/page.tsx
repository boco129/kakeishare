import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { LoginForm } from "./_components/login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const session = await auth()
  if (session) redirect("/")

  const params = await searchParams
  return <LoginForm callbackUrl={params.callbackUrl ?? "/"} />
}
