// prisma/seed.ts — カケイシェア シードデータ投入
// 実行: pnpm prisma db seed

import { PrismaClient } from "../src/generated/prisma/client"
import { Visibility, ExpenseSource, Role } from "../src/generated/prisma/enums"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import bcrypt from "bcryptjs"

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
})
const prisma = new PrismaClient({ adapter })

// JST固定で日付生成（タイムゾーン依存を回避）
const d = (ymd: string) => new Date(`${ymd}T00:00:00+09:00`)
const dt = (isoLocal: string) => new Date(`${isoLocal}+09:00`)

async function main() {
  const password = await bcrypt.hash("password123", 10)

  await prisma.$transaction(async (tx) => {
    // === 子テーブルから削除（外部キー制約順） ===
    await tx.installment.deleteMany()
    await tx.expense.deleteMany()
    await tx.csvImport.deleteMany()
    await tx.budget.deleteMany()
    await tx.categoryVisibilitySetting.deleteMany()
    await tx.category.deleteMany()
    await tx.user.deleteMany()

    // === 1. ユーザー ===
    await tx.user.createMany({
      data: [
        {
          id: "user_husband",
          name: "太郎",
          email: "taro@example.com",
          password,
          role: Role.ADMIN,
        },
        {
          id: "user_wife",
          name: "花子",
          email: "hanako@example.com",
          password,
          role: Role.MEMBER,
        },
      ],
    })

    // === 2. カテゴリ ===
    await tx.category.createMany({
      data: [
        { id: "cat_food", name: "食費", icon: "🍽", isFixedCost: false, defaultVisibility: Visibility.PUBLIC, sortOrder: 1 },
        { id: "cat_daily", name: "日用品", icon: "🏪", isFixedCost: false, defaultVisibility: Visibility.PUBLIC, sortOrder: 2 },
        { id: "cat_housing", name: "住居", icon: "🏠", isFixedCost: true, defaultVisibility: Visibility.PUBLIC, sortOrder: 3 },
        { id: "cat_utility", name: "光熱費", icon: "💡", isFixedCost: true, defaultVisibility: Visibility.PUBLIC, sortOrder: 4 },
        { id: "cat_telecom", name: "通信費", icon: "📱", isFixedCost: true, defaultVisibility: Visibility.PUBLIC, sortOrder: 5 },
        { id: "cat_transport", name: "交通費", icon: "🚃", isFixedCost: false, defaultVisibility: Visibility.PUBLIC, sortOrder: 6 },
        { id: "cat_social", name: "交際費", icon: "🍻", isFixedCost: false, defaultVisibility: Visibility.AMOUNT_ONLY, sortOrder: 7 },
        { id: "cat_clothing", name: "衣服・美容", icon: "👗", isFixedCost: false, defaultVisibility: Visibility.AMOUNT_ONLY, sortOrder: 8 },
        { id: "cat_medical", name: "医療", icon: "🏥", isFixedCost: false, defaultVisibility: Visibility.AMOUNT_ONLY, sortOrder: 9 },
        { id: "cat_education", name: "教育", icon: "📚", isFixedCost: false, defaultVisibility: Visibility.PUBLIC, sortOrder: 10 },
        { id: "cat_hobby", name: "個人娯楽", icon: "🎮", isFixedCost: false, defaultVisibility: Visibility.CATEGORY_TOTAL, sortOrder: 11 },
        { id: "cat_subscription", name: "サブスク", icon: "🔄", isFixedCost: true, defaultVisibility: Visibility.PUBLIC, sortOrder: 12 },
        { id: "cat_insurance", name: "保険", icon: "🛡", isFixedCost: true, defaultVisibility: Visibility.PUBLIC, sortOrder: 13 },
        { id: "cat_car", name: "自動車", icon: "🚗", isFixedCost: false, defaultVisibility: Visibility.PUBLIC, sortOrder: 14 },
        { id: "cat_other", name: "その他", icon: "📦", isFixedCost: false, defaultVisibility: Visibility.AMOUNT_ONLY, sortOrder: 15 },
      ],
    })

    // === 2.5 ユーザー別カテゴリ公開レベル設定 ===
    // 夫婦それぞれのプライバシー設定（カテゴリのdefaultVisibilityと異なる設定のみ）
    await tx.categoryVisibilitySetting.createMany({
      data: [
        // 妻: 交際費を「合計のみ」に変更（デフォルトは「金額のみ」）
        { userId: "user_wife", categoryId: "cat_social", visibility: Visibility.CATEGORY_TOTAL },
        // 妻: 衣服・美容を「合計のみ」に変更（デフォルトは「金額のみ」）
        { userId: "user_wife", categoryId: "cat_clothing", visibility: Visibility.CATEGORY_TOTAL },
        // 夫: 個人娯楽を「金額のみ」に変更（デフォルトは「合計のみ」）
        { userId: "user_husband", categoryId: "cat_hobby", visibility: Visibility.AMOUNT_ONLY },
      ],
    })

    // === 3. 予算（2026年1月・2月） ===
    const budgetCategories = [
      { categoryId: "cat_food", amount: 80000 },
      { categoryId: "cat_daily", amount: 30000 },
      { categoryId: "cat_housing", amount: 95000 },
      { categoryId: "cat_utility", amount: 15000 },
      { categoryId: "cat_telecom", amount: 20000 },
      { categoryId: "cat_transport", amount: 25000 },
      { categoryId: "cat_social", amount: 30000 },
      { categoryId: "cat_clothing", amount: 20000 },
      { categoryId: "cat_medical", amount: 10000 },
      { categoryId: "cat_hobby", amount: 30000 },
      { categoryId: "cat_subscription", amount: 5000 },
      { categoryId: "cat_insurance", amount: 10000 },
      { categoryId: "cat_car", amount: 10000 },
      { categoryId: "cat_other", amount: 20000 },
    ]

    const budgetData = ["2026-01", "2026-02"].flatMap((yearMonth, mi) =>
      budgetCategories.map((b, ci) => ({
        id: `bud_${String(mi * 14 + ci + 1).padStart(2, "0")}`,
        yearMonth,
        categoryId: b.categoryId,
        amount: b.amount,
      }))
    )

    await tx.budget.createMany({ data: budgetData })

    // === 4. CSV取り込み履歴 ===
    await tx.csvImport.createMany({
      data: [
        {
          id: "imp_01",
          userId: "user_wife",
          importedById: "user_wife",
          cardType: "epos",
          cardName: "エポスカード",
          yearMonth: "2026-01",
          importedAt: dt("2026-02-01T10:00:00"),
          recordCount: 18,
          unconfirmedCount: 3,
          fileHash: "seed:user_wife:epos:2026-01",
        },
        {
          id: "imp_02",
          userId: "user_husband",
          importedById: "user_husband",
          cardType: "mufg_jcb",
          cardName: "MUFG JCBカード",
          yearMonth: "2026-01",
          importedAt: dt("2026-02-01T10:15:00"),
          recordCount: 17,
          unconfirmedCount: 1,
          fileHash: "seed:user_husband:mufg_jcb:2026-01",
        },
        {
          id: "imp_03",
          userId: "user_husband",
          importedById: "user_husband",
          cardType: "mufg_visa",
          cardName: "MUFG VISAカード",
          yearMonth: "2026-01",
          importedAt: dt("2026-02-01T10:20:00"),
          recordCount: 9,
          unconfirmedCount: 1,
          fileHash: "seed:user_husband:mufg_visa:2026-01",
        },
      ],
    })

    // === 5. 支出データ ===

    // 支出データの型定義
    type RawExpense = {
      id: string
      date: string
      description: string
      amount: number
      categoryId: string
      visibility: Visibility
      confirmed: boolean
      isSubstitute: boolean
      actualAmount: number | null
      memo: string | null
    }

    // 5.1 妻の支出（エポスカード）
    const wifeExpenses: RawExpense[] = [
      { id: "exp_w01", date: "2026-01-03", description: "マルエツ 豊洲店", amount: 2480, categoryId: "cat_food", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_w02", date: "2026-01-05", description: "スターバックス 渋谷店", amount: 580, categoryId: "cat_food", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_w03", date: "2026-01-07", description: "Amazon.co.jp", amount: 3200, categoryId: "cat_daily", visibility: Visibility.PUBLIC, confirmed: false, isSubstitute: false, actualAmount: null, memo: "掃除機フィルター" },
      { id: "exp_w04", date: "2026-01-08", description: "セブン-イレブン 勝どき駅前店", amount: 890, categoryId: "cat_food", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_w05", date: "2026-01-10", description: "ユニクロ ららぽーと豊洲", amount: 5980, categoryId: "cat_clothing", visibility: Visibility.AMOUNT_ONLY, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_w06", date: "2026-01-12", description: "居酒屋 魚民 新宿東口店", amount: 18500, categoryId: "cat_social", visibility: Visibility.AMOUNT_ONLY, confirmed: true, isSubstitute: true, actualAmount: 3700, memo: "5人で飲み会、立替" },
      { id: "exp_w07", date: "2026-01-14", description: "マツモトキヨシ 月島店", amount: 1240, categoryId: "cat_daily", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_w08", date: "2026-01-15", description: "ZARA オンラインストア", amount: 12000, categoryId: "cat_clothing", visibility: Visibility.AMOUNT_ONLY, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_w09", date: "2026-01-17", description: "東京メトロ 定期券", amount: 8400, categoryId: "cat_transport", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_w10", date: "2026-01-18", description: "Netflix", amount: 1490, categoryId: "cat_subscription", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "家族共有" },
      { id: "exp_w11", date: "2026-01-20", description: "焼肉きんぐ 豊洲店", amount: 25600, categoryId: "cat_food", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "家族ディナー" },
      { id: "exp_w12", date: "2026-01-22", description: "ダイソー 豊洲店", amount: 330, categoryId: "cat_daily", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_w13", date: "2026-01-23", description: "美容室 EARTH 銀座店", amount: 7800, categoryId: "cat_clothing", visibility: Visibility.AMOUNT_ONLY, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_w14", date: "2026-01-25", description: "Amazon.co.jp", amount: -1200, categoryId: "cat_daily", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "返品" },
      { id: "exp_w15", date: "2026-01-26", description: "漫画全巻ドットコム", amount: 4800, categoryId: "cat_hobby", visibility: Visibility.CATEGORY_TOTAL, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_w16", date: "2026-01-27", description: "サイゼリヤ 勝どき店", amount: 1850, categoryId: "cat_food", visibility: Visibility.PUBLIC, confirmed: false, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_w17", date: "2026-01-28", description: "Spotify", amount: 980, categoryId: "cat_subscription", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_w18", date: "2026-01-30", description: "ドン・キホーテ 銀座本館", amount: 4560, categoryId: "cat_daily", visibility: Visibility.PUBLIC, confirmed: false, isSubstitute: false, actualAmount: null, memo: null },
    ]

    // 5.2 夫の支出（MUFG JCBカード）
    const husbandJcbExpenses: RawExpense[] = [
      { id: "exp_h01", date: "2026-01-03", description: "ヨドバシカメラ マルチメディアAkiba", amount: 45000, categoryId: "cat_other", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "イヤホン" },
      { id: "exp_h02", date: "2026-01-05", description: "東京電力エナジーパートナー", amount: 8500, categoryId: "cat_utility", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_h03", date: "2026-01-05", description: "東京ガス", amount: 4200, categoryId: "cat_utility", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_h04", date: "2026-01-06", description: "NTTドコモ", amount: 8800, categoryId: "cat_telecom", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_h05", date: "2026-01-07", description: "au（KDDI）", amount: 5500, categoryId: "cat_telecom", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "妻の回線" },
      { id: "exp_h06", date: "2026-01-08", description: "Suica チャージ", amount: 5000, categoryId: "cat_transport", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "オートチャージ" },
      { id: "exp_h07", date: "2026-01-10", description: "Amazon.co.jp", amount: 2800, categoryId: "cat_daily", visibility: Visibility.PUBLIC, confirmed: false, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_h08", date: "2026-01-12", description: "コストコ 幕張倉庫店", amount: 18900, categoryId: "cat_food", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "週末まとめ買い" },
      { id: "exp_h09", date: "2026-01-14", description: "ENEOS セルフ豊洲", amount: 6800, categoryId: "cat_car", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "ガソリン" },
      { id: "exp_h10", date: "2026-01-15", description: "Apple.com/bill", amount: 36000, categoryId: "cat_other", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "MacBook修理" },
      { id: "exp_h11", date: "2026-01-17", description: "SBI損保", amount: 4500, categoryId: "cat_insurance", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "自動車保険" },
      { id: "exp_h12", date: "2026-01-19", description: "同僚との飲み会（居酒屋）", amount: 8200, categoryId: "cat_social", visibility: Visibility.AMOUNT_ONLY, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_h13", date: "2026-01-20", description: "楽天市場", amount: 3400, categoryId: "cat_daily", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "文房具" },
      { id: "exp_h14", date: "2026-01-22", description: "マクドナルド 豊洲店", amount: 1280, categoryId: "cat_food", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_h15", date: "2026-01-24", description: "Steam", amount: 6800, categoryId: "cat_hobby", visibility: Visibility.CATEGORY_TOTAL, confirmed: true, isSubstitute: false, actualAmount: null, memo: "ゲーム購入" },
      { id: "exp_h16", date: "2026-01-25", description: "Y!mobile", amount: 3200, categoryId: "cat_telecom", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "予備回線" },
      { id: "exp_h17", date: "2026-01-28", description: "Amazon Prime会費", amount: 600, categoryId: "cat_subscription", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "年間プラン月割" },
    ]

    // 5.3 夫の支出（MUFG VISAカード）
    const husbandVisaExpenses: RawExpense[] = [
      { id: "exp_h18", date: "2026-01-02", description: "西友 豊洲店", amount: 5600, categoryId: "cat_food", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_h19", date: "2026-01-05", description: "家賃（管理費込）", amount: 95000, categoryId: "cat_housing", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_h20", date: "2026-01-09", description: "ニトリ オンラインショップ", amount: 24000, categoryId: "cat_daily", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "本棚" },
      { id: "exp_h21", date: "2026-01-11", description: "スシロー 豊洲店", amount: 4200, categoryId: "cat_food", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "家族ランチ" },
      { id: "exp_h22", date: "2026-01-16", description: "JR東日本 えきねっと", amount: 12000, categoryId: "cat_transport", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "帰省用新幹線" },
      { id: "exp_h23", date: "2026-01-19", description: "ビックカメラ.com", amount: 8900, categoryId: "cat_other", visibility: Visibility.PUBLIC, confirmed: false, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_h24", date: "2026-01-23", description: "サンドラッグ 月島店", amount: 2100, categoryId: "cat_daily", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_h25", date: "2026-01-26", description: "Uber Eats", amount: 2800, categoryId: "cat_food", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: null },
      { id: "exp_h26", date: "2026-01-29", description: "東京都水道局", amount: 3400, categoryId: "cat_utility", visibility: Visibility.PUBLIC, confirmed: true, isSubstitute: false, actualAmount: null, memo: "2ヶ月に1回" },
    ]

    // 支出データを投入
    const allExpenses = [
      ...wifeExpenses.map((e) => ({
        ...e,
        date: d(e.date),
        userId: "user_wife",
        source: ExpenseSource.CSV_IMPORT,
        csvImportId: "imp_01",
        aiCategorized: true,
      })),
      ...husbandJcbExpenses.map((e) => ({
        ...e,
        date: d(e.date),
        userId: "user_husband",
        source: ExpenseSource.CSV_IMPORT,
        csvImportId: "imp_02",
        aiCategorized: true,
      })),
      ...husbandVisaExpenses.map((e) => ({
        ...e,
        date: d(e.date),
        userId: "user_husband",
        source: ExpenseSource.CSV_IMPORT,
        csvImportId: "imp_03",
        aiCategorized: true,
      })),
    ]

    await tx.expense.createMany({ data: allExpenses })

    // === 6. 分割払い ===
    await tx.installment.createMany({
      data: [
        {
          id: "inst_01",
          userId: "user_wife",
          description: "ZARA オンラインストア",
          totalAmount: 12000,
          monthlyAmount: 4000,
          totalMonths: 3,
          remainingMonths: 2,
          startDate: d("2026-01-15"),
          visibility: Visibility.AMOUNT_ONLY,
          fee: 0,
        },
        {
          id: "inst_02",
          userId: "user_husband",
          description: "Apple.com/bill MacBook修理",
          totalAmount: 36000,
          monthlyAmount: 12400,
          totalMonths: 3,
          remainingMonths: 3,
          startDate: d("2026-01-15"),
          visibility: Visibility.PUBLIC,
          fee: 1200,
        },
        {
          id: "inst_03",
          userId: "user_husband",
          description: "ニトリ 本棚",
          totalAmount: 24000,
          monthlyAmount: 8267,
          totalMonths: 3,
          remainingMonths: 3,
          startDate: d("2026-01-09"),
          visibility: Visibility.PUBLIC,
          fee: 800,
        },
      ],
    })

    // 投入結果の確認
    const counts = {
      users: await tx.user.count(),
      categories: await tx.category.count(),
      categoryVisibilitySettings: await tx.categoryVisibilitySetting.count(),
      budgets: await tx.budget.count(),
      expenses: await tx.expense.count(),
      installments: await tx.installment.count(),
      csvImports: await tx.csvImport.count(),
    }

    console.log("✅ Seed data inserted successfully")
    console.log(counts)
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
