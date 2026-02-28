// ダッシュボード ローディングスケルトン

import { Card, CardContent, CardHeader } from "@/components/ui/card"

function SkeletonBox({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ""}`} />
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* 予算カード */}
      <Card>
        <CardHeader className="pb-2">
          <SkeletonBox className="h-4 w-16" />
        </CardHeader>
        <CardContent className="space-y-3">
          <SkeletonBox className="mx-auto h-8 w-32" />
          <SkeletonBox className="h-3 w-full" />
          <div className="flex justify-between">
            <SkeletonBox className="h-3 w-20" />
            <SkeletonBox className="h-3 w-20" />
          </div>
        </CardContent>
      </Card>

      {/* 今月支出 + 前月比 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 space-y-2">
            <SkeletonBox className="h-3 w-16" />
            <SkeletonBox className="h-6 w-24" />
            <SkeletonBox className="h-3 w-12" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <SkeletonBox className="h-3 w-16" />
            <SkeletonBox className="h-6 w-24" />
            <SkeletonBox className="h-3 w-12" />
          </CardContent>
        </Card>
      </div>

      {/* カテゴリ別円グラフ */}
      <Card>
        <CardHeader className="pb-2">
          <SkeletonBox className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <SkeletonBox className="h-[220px] w-full" />
        </CardContent>
      </Card>

      {/* 夫婦比率 */}
      <Card>
        <CardHeader className="pb-2">
          <SkeletonBox className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <SkeletonBox className="h-[80px] w-full" />
        </CardContent>
      </Card>

      {/* 月次推移 */}
      <Card>
        <CardHeader className="pb-2">
          <SkeletonBox className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <SkeletonBox className="h-[240px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
