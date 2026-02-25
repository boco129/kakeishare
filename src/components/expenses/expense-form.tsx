"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { visibilitySchema } from "@/lib/validations/expense"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

// 指摘#5: 既存スキーマから導出し重複を排除
type Visibility = z.infer<typeof visibilitySchema>
const visibilityValues = visibilitySchema.options

const visibilityLabels: Record<Visibility, { label: string; color: string; description: string }> = {
  PUBLIC: { label: "公開", color: "bg-green-500", description: "全情報を共有" },
  AMOUNT_ONLY: { label: "金額のみ", color: "bg-yellow-500", description: "店舗名を非表示" },
  CATEGORY_TOTAL: { label: "合計のみ", color: "bg-red-500", description: "明細を非表示" },
}

// 指摘#1: userVisibility を追加
type Category = {
  id: string
  name: string
  icon: string
  defaultVisibility: Visibility
  userVisibility: Visibility
}

// フォーム用バリデーションスキーマ（クライアント側）
const formSchema = z.object({
  date: z.string().min(1, "日付は必須です"),
  amount: z.number().int().positive("金額は1以上で入力してください"),
  categoryId: z.string().optional(),
  description: z.string().trim().min(1, "説明は必須です").max(200, "200文字以内で入力してください"),
  memo: z.string().trim().max(1000, "1000文字以内で入力してください").optional(),
  visibility: z.enum(visibilityValues),
  isSubstitute: z.boolean(),
  actualAmount: z.number().int().positive("自己負担額は1以上で入力してください").optional(),
}).superRefine((v, ctx) => {
  if (v.isSubstitute && v.actualAmount == null) {
    ctx.addIssue({ code: "custom", path: ["actualAmount"], message: "自己負担額を入力してください" })
  }
  if (v.actualAmount != null && v.amount && v.actualAmount > v.amount) {
    ctx.addIssue({ code: "custom", path: ["actualAmount"], message: "自己負担額は支出額以下にしてください" })
  }
})

type FormValues = z.infer<typeof formSchema>

export function ExpenseForm({
  onSuccess,
  onClose,
}: {
  onSuccess: () => void
  onClose: () => void
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      amount: 0,
      categoryId: undefined,
      description: "",
      memo: "",
      visibility: "PUBLIC",
      isSubstitute: false,
      actualAmount: undefined,
    },
  })

  // 指摘#3: AbortController + 例外処理を追加
  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      try {
        const res = await fetch("/api/categories", { signal: controller.signal })
        if (!res.ok) return
        const json = await res.json()
        setCategories(json.data ?? [])
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          toast.error("カテゴリの取得に失敗しました")
        }
      }
    })()

    return () => controller.abort()
  }, [])

  const categoryId = form.watch("categoryId")
  const isSubstitute = form.watch("isSubstitute")

  // 指摘#1: userVisibility を優先してセット
  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  )

  useEffect(() => {
    if (selectedCategory) {
      form.setValue("visibility", selectedCategory.userVisibility, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
  }, [selectedCategory, form])

  // 指摘#2: ネットワークエラー・JSONパースエラーに対応
  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true)
    try {
      const body = {
        ...values,
        categoryId: values.categoryId || null,
        memo: values.memo?.trim() ? values.memo : null,
        actualAmount: values.isSubstitute ? values.actualAmount ?? null : null,
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      let json: { error?: { message?: string } } | null = null
      try {
        json = await res.json()
      } catch {
        // JSONでないレスポンスは汎用メッセージにフォールバック
      }

      if (!res.ok) {
        toast.error(json?.error?.message ?? "登録に失敗しました")
        return
      }

      toast.success("支出を登録しました")
      form.reset()
      onSuccess()
      onClose()
    } catch {
      toast.error("ネットワークエラーが発生しました")
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        {/* 日付・金額 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            name="date"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>日付</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="amount"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>金額（円）</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* カテゴリ */}
        <FormField
          name="categoryId"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>カテゴリ</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 説明/店舗名 */}
        <FormField
          name="description"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>説明 / 店舗名</FormLabel>
              <FormControl>
                <Input placeholder="例: スーパーマーケット" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 公開レベル */}
        <FormField
          name="visibility"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>公開レベル</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid gap-2"
                >
                  {visibilityValues.map((v) => {
                    const { label, color, description } = visibilityLabels[v]
                    return (
                      <label
                        key={v}
                        htmlFor={`visibility-${v}`}
                        className="flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary/5"
                      >
                        <RadioGroupItem value={v} id={`visibility-${v}`} />
                        <span className={`inline-block size-2 shrink-0 rounded-full ${color}`} />
                        <span className="text-sm">
                          <span className="font-medium">{label}</span>
                          <span className="text-muted-foreground"> — {description}</span>
                        </span>
                      </label>
                    )
                  })}
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />

        {/* メモ */}
        <FormField
          name="memo"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>メモ（任意）</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder="補足情報があれば入力" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 指摘#4: id/htmlFor でラベルとチェックボックスを関連付け */}
        <FormField
          name="isSubstitute"
          control={form.control}
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Checkbox
                  id="isSubstitute"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(Boolean(v))}
                />
              </FormControl>
              <FormLabel htmlFor="isSubstitute" className="!mt-0 cursor-pointer">
                立替支出
              </FormLabel>
            </FormItem>
          )}
        />

        {/* 自己負担額（立替時のみ） */}
        {isSubstitute && (
          <FormField
            name="actualAmount"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>自己負担額（円）</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    placeholder="0"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const v = e.target.valueAsNumber
                      field.onChange(Number.isNaN(v) ? undefined : v)
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* ボタン */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            キャンセル
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? "登録中..." : "登録"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
