"use client"

import { useState, useCallback } from "react"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ExpenseForm } from "./expense-form"

export function ExpensesPageClient({ userLabel }: { userLabel: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">支出一覧</h1>
            <p className="text-sm text-muted-foreground">
              {userLabel}さんの支出
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                支出を追加
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>支出を追加</DialogTitle>
              </DialogHeader>
              <ExpenseForm
                onSuccess={refresh}
                onClose={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* 支出一覧は今後実装（Issue #15 以降） */}
        <div className="rounded-lg border p-6 text-center text-muted-foreground">
          支出一覧は今後実装予定です
        </div>
      </div>
    </div>
  )
}
