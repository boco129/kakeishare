import { db } from "@/lib/db"
import { getCardOptions, CARD_OWNERS } from "@/lib/csv"
import { AlertTriangle, CheckCircle2, CreditCard } from "lucide-react"
import { Badge } from "@/components/ui/badge"

/** 今月のYYYY-MM */
function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/** ダッシュボード用 CSV取り込みステータスウィジェット（Server Component） */
export async function CsvImportStatusWidget() {
  const yearMonth = getCurrentYearMonth()

  const [imports, users] = await Promise.all([
    db.csvImport.findMany({
      where: { yearMonth },
    }),
    db.user.findMany({
      select: { id: true, name: true },
    }),
  ])

  const cardOptions = getCardOptions()
  const cardNameMap = new Map(cardOptions.map((c) => [c.value, c.label]))
  const userNameMap = new Map(users.map((u) => [u.id, u.name]))

  const items = CARD_OWNERS.map((pair) => {
    const hit = imports.find(
      (i) => i.userId === pair.userId && i.cardType === pair.cardType,
    )
    return {
      ownerName: userNameMap.get(pair.userId) ?? "不明",
      cardName: cardNameMap.get(pair.cardType) ?? pair.cardType,
      imported: !!hit,
      importedAt: hit?.importedAt ?? null,
      recordCount: hit?.recordCount ?? 0,
    }
  })

  const missingCount = items.filter((i) => !i.imported).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CreditCard className="size-4" />
          CSV取り込みステータス
        </h2>
        <Badge variant="outline" className="text-xs">
          {yearMonth}
        </Badge>
      </div>

      {missingCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{missingCount}件のCSVが未取り込みです</span>
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div>
              <span className="text-sm font-medium">{item.ownerName}</span>
              <span className="text-sm text-muted-foreground"> / {item.cardName}</span>
            </div>
            {item.imported ? (
              <div className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 className="size-4" />
                <span>{item.recordCount}件</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-amber-600">
                <AlertTriangle className="size-4" />
                <span>未取込</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
