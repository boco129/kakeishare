"use client"

import { useState, useCallback, useRef } from "react"
import { toast } from "sonner"
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"

type UserInfo = { id: string; name: string }

/** カード選択肢 */
const CARD_OPTIONS = [
  { value: "epos", label: "エポスカード" },
  { value: "mufg_jcb", label: "MUFG JCBカード" },
  { value: "mufg_visa", label: "MUFG VISAカード" },
]

type Step = "meta" | "upload" | "preview"

type PreviewRow = {
  date: string
  description: string
  amount: number
  isDuplicate: boolean
}

type PreviewData = {
  cardName: string
  yearMonth: string
  totalRows: number
  duplicateCount: number
  newCount: number
  previewRows: PreviewRow[]
}

type ImportResult = {
  importedCount: number
  duplicateCount: number
  totalRows: number
  aiClassified: boolean
  unconfirmedCount: number
}

export function CsvImportDialog({
  open,
  onOpenChange,
  users,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: UserInfo[]
  onImported?: () => void
}) {
  const [step, setStep] = useState<Step>("meta")
  const [cardType, setCardType] = useState("")
  const [ownerUserId, setOwnerUserId] = useState("")
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setStep("meta")
    setCardType("")
    setOwnerUserId("")
    setYearMonth(getCurrentYearMonth())
    setFile(null)
    setPreview(null)
    setLoading(false)
    setResult(null)
  }, [])

  const handleClose = useCallback((isOpen: boolean) => {
    if (!isOpen) reset()
    onOpenChange(isOpen)
  }, [onOpenChange, reset])

  // ファイル選択・D&D後に自動プレビュー
  const handleFile = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setLoading(true)
    setStep("preview")

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("cardType", cardType)
      formData.append("yearMonth", yearMonth)
      formData.append("ownerUserId", ownerUserId)

      const res = await fetch("/api/csv-import/preview", {
        method: "POST",
        body: formData,
      })

      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? "プレビューに失敗しました")
        setStep("upload")
        setFile(null)
        return
      }

      setPreview(json.data)
    } catch {
      toast.error("プレビューに失敗しました")
      setStep("upload")
      setFile(null)
    } finally {
      setLoading(false)
    }
  }, [cardType, yearMonth, ownerUserId])

  // D&Dハンドラー
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFile(droppedFile)
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) handleFile(selectedFile)
  }, [handleFile])

  // 取り込み実行
  const handleImport = useCallback(async () => {
    if (!file) return
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("cardType", cardType)
      formData.append("yearMonth", yearMonth)
      formData.append("ownerUserId", ownerUserId)

      const res = await fetch("/api/csv-import", {
        method: "POST",
        body: formData,
      })

      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error?.message ?? "取り込みに失敗しました")
        return
      }

      setResult(json.data)
      toast.success(`${json.data.importedCount}件の支出を取り込みました`)
      onImported?.()
    } catch {
      toast.error("取り込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }, [file, cardType, yearMonth, ownerUserId, onImported])

  const canProceedToUpload = cardType && ownerUserId && yearMonth

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {result ? "取り込み完了" : "CSV取り込み"}
          </DialogTitle>
        </DialogHeader>

        {/* 完了画面 */}
        {result ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="size-12 text-green-500" />
              <p className="text-lg font-semibold">取り込みが完了しました</p>
            </div>
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">取り込み件数</span>
                <span className="font-semibold">{result.importedCount}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">重複スキップ</span>
                <span className="text-muted-foreground">{result.duplicateCount}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CSV総行数</span>
                <span className="text-muted-foreground">{result.totalRows}件</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AI分類</span>
                <span className={result.aiClassified ? "text-green-600" : "text-muted-foreground"}>
                  {result.aiClassified ? "実行済み" : "スキップ"}
                </span>
              </div>
              {result.aiClassified && result.unconfirmedCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">要確認</span>
                  <span className="font-semibold text-amber-600">{result.unconfirmedCount}件</span>
                </div>
              )}
            </div>
            <Button className="w-full" onClick={() => handleClose(false)}>
              閉じる
            </Button>
          </div>
        ) : step === "meta" ? (
          /* Step 1: メタ情報選択 */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>カード種別</Label>
              <Select value={cardType} onValueChange={setCardType}>
                <SelectTrigger>
                  <SelectValue placeholder="カードを選択" />
                </SelectTrigger>
                <SelectContent>
                  {CARD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>カード所有者</Label>
              <Select value={ownerUserId} onValueChange={setOwnerUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="所有者を選択" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>対象年月</Label>
              <input
                type="month"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <Button
              className="w-full"
              disabled={!canProceedToUpload}
              onClick={() => setStep("upload")}
            >
              次へ: ファイル選択
            </Button>
          </div>
        ) : step === "upload" ? (
          /* Step 2: ファイルアップロード */
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => { setStep("meta"); setFile(null); setPreview(null) }}
            >
              <ArrowLeft className="size-4" />
              戻る
            </Button>

            <div className="text-sm text-muted-foreground">
              {CARD_OPTIONS.find((c) => c.value === cardType)?.label} /
              {users.find((u) => u.id === ownerUserId)?.name} /
              {yearMonth}
            </div>

            <div
              className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                CSVファイルをドラッグ&ドロップ
              </p>
              <p className="text-xs text-muted-foreground">または</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                ファイルを選択
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          </div>
        ) : (
          /* Step 3: プレビュー + 実行 */
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => { setStep("upload"); setFile(null); setPreview(null) }}
            >
              <ArrowLeft className="size-4" />
              戻る
            </Button>

            {loading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">CSVを解析中...</p>
              </div>
            ) : preview ? (
              <>
                {/* ファイル情報 */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="size-4" />
                  <span>{file?.name}</span>
                </div>

                {/* サマリー */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{preview.newCount}</p>
                    <p className="text-xs text-muted-foreground">新規取込</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-muted-foreground">{preview.duplicateCount}</p>
                    <p className="text-xs text-muted-foreground">重複スキップ</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-muted-foreground">{preview.totalRows}</p>
                    <p className="text-xs text-muted-foreground">CSV総行数</p>
                  </div>
                </div>

                {/* プレビューテーブル */}
                <div className="max-h-[300px] overflow-auto rounded-lg border">
                  <table className="min-w-[480px] w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">日付</th>
                        <th className="px-3 py-2 text-left font-medium">内容</th>
                        <th className="px-3 py-2 text-right font-medium">金額</th>
                        <th className="px-3 py-2 text-center font-medium">状態</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.previewRows.map((row, i) => (
                        <tr
                          key={i}
                          className={`border-t ${row.isDuplicate ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}
                        >
                          <td className="whitespace-nowrap px-3 py-2">{row.date}</td>
                          <td className="max-w-[160px] truncate px-3 py-2">{row.description}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            {row.amount < 0 ? (
                              <span className="text-red-500">{row.amount.toLocaleString()}</span>
                            ) : (
                              `¥${row.amount.toLocaleString()}`
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {row.isDuplicate ? (
                              <Badge variant="outline" className="gap-1 text-amber-600">
                                <AlertTriangle className="size-3" />
                                重複
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600">新規</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {preview.totalRows > 100 && (
                  <p className="text-center text-xs text-muted-foreground">
                    先頭100件を表示しています（全{preview.totalRows}件）
                  </p>
                )}

                {/* 実行ボタン */}
                <Button
                  className="w-full"
                  onClick={handleImport}
                  disabled={loading || preview.newCount === 0}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      取り込み中...
                    </>
                  ) : preview.newCount === 0 ? (
                    "取り込むデータがありません"
                  ) : (
                    `${preview.newCount}件を取り込む`
                  )}
                </Button>
              </>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}
