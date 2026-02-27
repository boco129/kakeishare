// Next.js instrumentation — アプリ起動時に環境変数を検証する
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // サーバー起動時のみ検証（Edge Runtimeでは実行しない）
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { env } = await import("@/lib/env")
    void env
  }
}
