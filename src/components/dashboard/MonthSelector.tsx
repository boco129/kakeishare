"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  yearMonth: string
}

function parseYearMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number)
  return { year: y, month: m }
}

function formatYearMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`
}

function addMonth(ym: string, delta: number) {
  const { year, month } = parseYearMonth(ym)
  const d = new Date(year, month - 1 + delta, 1)
  return formatYearMonth(d.getFullYear(), d.getMonth() + 1)
}

export function MonthSelector({ yearMonth }: Props) {
  const router = useRouter()
  const { year, month } = parseYearMonth(yearMonth)

  const navigate = (ym: string) => {
    router.push(`/?yearMonth=${ym}`)
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(addMonth(yearMonth, -1))}
        aria-label="前月"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-xl font-bold">{year}年{month}月の家計</h1>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(addMonth(yearMonth, 1))}
        aria-label="翌月"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}
