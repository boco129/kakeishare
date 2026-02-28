import { describe, expect, it } from "vitest"
import iconv from "iconv-lite"
import { parseCsv } from "./parser"
import { eposMapping } from "./mappings/epos"
import { mufgJcbMapping } from "./mappings/mufg-jcb"
import { mufgVisaMapping } from "./mappings/mufg-visa"
import type { CardCsvDefinition } from "./types"

// ヘルパー: UTF-8 CSV文字列を Buffer に変換
function utf8Buf(csv: string): Buffer {
  return Buffer.from(csv, "utf-8")
}

// ヘルパー: Shift_JIS CSV文字列を Buffer に変換
function sjisBuf(csv: string): Buffer {
  return iconv.encode(csv, "Shift_JIS")
}

// テスト用の最小定義（UTF-8）
const simpleDefinition: CardCsvDefinition = {
  id: "epos",
  name: "テスト",
  encoding: "UTF-8",
  skipRows: 0,
  hasHeader: true,
  delimiter: ",",
  mapping: {
    date: { column: "日付", format: "YYYY/MM/DD" },
    description: { column: "店舗名" },
    amount: { column: "金額", type: "integer" },
  },
}

// ---------- エンコーディング変換 ----------

describe("エンコーディング変換", () => {
  it("Shift_JIS → UTF-8 変換が正しく行われる", () => {
    const csv = "ご利用日,ご利用先・商品名,ご利用金額,お支払区分,備考\n2026/01/15,スーパー山田,1500,1回払い,食料品\n"
    const buf = sjisBuf(csv)
    const result = parseCsv(buf, eposMapping)

    expect(result).toHaveLength(1)
    expect(result[0].description).toBe("スーパー山田")
    expect(result[0].amount).toBe(1500)
  })

  it("UTF-8 入力がそのまま処理される", () => {
    const csv = "日付,店舗名,金額\n2026/01/15,テスト店,1000\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result).toHaveLength(1)
    expect(result[0].description).toBe("テスト店")
  })
})

// ---------- 日付パース ----------

describe("日付パース", () => {
  it("YYYY/MM/DD 形式が YYYY-MM-DD に変換される", () => {
    const csv = "日付,店舗名,金額\n2026/01/05,テスト,500\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result).toHaveLength(1)
    expect(result[0].date).toBe("2026-01-05")
  })

  it("YYYY-MM-DD 形式がそのまま処理される", () => {
    const csv = "日付,店舗名,金額\n2026-03-20,テスト,500\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result).toHaveLength(1)
    expect(result[0].date).toBe("2026-03-20")
  })

  it("不正な日付文字列 → 行がスキップされる", () => {
    const csv = "日付,店舗名,金額\ninvalid-date,テスト,500\n2026/01/15,テスト2,600\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result).toHaveLength(1)
    expect(result[0].description).toBe("テスト2")
  })

  it("存在しない日付（2月30日）→ 行がスキップされる", () => {
    const csv = "日付,店舗名,金額\n2026/02/30,テスト,500\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result).toHaveLength(0)
  })
})

// ---------- 金額変換 ----------

describe("金額変換", () => {
  it("通常の整数金額", () => {
    const csv = "日付,店舗名,金額\n2026/01/15,テスト,1500\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result[0].amount).toBe(1500)
  })

  it("カンマ区切り金額（例: 1,234）", () => {
    const csv = "日付,店舗名,金額\n2026/01/15,テスト,\"1,234\"\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result[0].amount).toBe(1234)
  })

  it("負数表記（(1234) 形式）", () => {
    const csv = "日付,店舗名,金額\n2026/01/15,返金,(1234)\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result[0].amount).toBe(-1234)
  })

  it("全角数字 → 半角変換", () => {
    const csv = "日付,店舗名,金額\n2026/01/15,テスト,１２３４\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result[0].amount).toBe(1234)
  })

  it("¥ / ￥ 記号付き金額が正規化される", () => {
    const csv = "日付,店舗名,金額\n2026/01/15,テスト,￥１，２３４\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result[0].amount).toBe(1234)
  })

  it("カンマ区切り負数 (1,234) 形式", () => {
    const csv = "日付,店舗名,金額\n2026/01/15,返金,\"(1,234)\"\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result[0].amount).toBe(-1234)
  })

  it("不正な金額文字列 → 行がスキップされる", () => {
    const csv = "日付,店舗名,金額\n2026/01/15,テスト,abc\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result).toHaveLength(0)
  })
})

// ---------- カードマッピング ----------

describe("カードマッピング", () => {
  describe("エポスカード", () => {
    it("正規化が正しく行われる", () => {
      const csv = "ご利用日,ご利用先・商品名,ご利用金額,お支払区分,備考\n2026/01/10,コンビニ太郎,250,1回払い,\n"
      const result = parseCsv(sjisBuf(csv), eposMapping)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        date: "2026-01-10",
        description: "コンビニ太郎",
        amount: 250,
        paymentMethod: "1回払い",
        installmentCount: null,
        memo: null,
      })
    })
  })

  describe("MUFG JCBカード", () => {
    it("正規化が正しく行われる", () => {
      const csv = "ご利用年月日,ご利用先など,ご利用金額,お支払区分\n2026/01/20,家電量販店,50000,1回払い\n"
      const result = parseCsv(sjisBuf(csv), mufgJcbMapping)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        date: "2026-01-20",
        description: "家電量販店",
        amount: 50000,
        paymentMethod: "1回払い",
        installmentCount: null,
        memo: null,
      })
    })

    it("分割払い回数が抽出される", () => {
      const csv = "ご利用年月日,ご利用先など,ご利用金額,お支払区分\n2026/01/20,家電量販店,120000,3回\n"
      const result = parseCsv(sjisBuf(csv), mufgJcbMapping)

      expect(result[0].installmentCount).toBe(3)
      expect(result[0].paymentMethod).toBe("3回")
    })
  })

  describe("MUFG VISAカード", () => {
    it("正規化が正しく行われる", () => {
      const csv = "ご利用日,ご利用先,\"ご利用金額（税込）\",利用区分\n2026/02/01,レストラン花,3500,1回払い\n"
      const result = parseCsv(sjisBuf(csv), mufgVisaMapping)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        date: "2026-02-01",
        description: "レストラン花",
        amount: 3500,
        paymentMethod: "1回払い",
        installmentCount: null,
        memo: null,
      })
    })

    it("alternateColumns でのフォールバック", () => {
      const csv = "ご利用日,ご利用先,ご利用金額,利用区分\n2026/02/01,レストラン花,3500,1回払い\n"
      const result = parseCsv(sjisBuf(csv), mufgVisaMapping)

      expect(result).toHaveLength(1)
      expect(result[0].amount).toBe(3500)
    })

    it("分割払い回数が抽出される", () => {
      const csv = "ご利用日,ご利用先,\"ご利用金額（税込）\",利用区分\n2026/02/01,家電店,240000,分割6回\n"
      const result = parseCsv(sjisBuf(csv), mufgVisaMapping)

      expect(result[0].installmentCount).toBe(6)
    })
  })
})

// ---------- エッジケース ----------

describe("エッジケース", () => {
  it("空のCSV（ヘッダーのみ）→ 空配列を返す", () => {
    const csv = "日付,店舗名,金額\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result).toEqual([])
  })

  it("複数行のCSVが全て正規化される", () => {
    const csv = "日付,店舗名,金額\n2026/01/01,店A,100\n2026/01/02,店B,200\n2026/01/03,店C,300\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result).toHaveLength(3)
    expect(result.map((r) => r.description)).toEqual(["店A", "店B", "店C"])
  })

  it("必須 description が空の行はスキップされる", () => {
    const csv = "日付,店舗名,金額\n2026/01/01,,100\n2026/01/02,店B,200\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result).toHaveLength(1)
    expect(result[0].description).toBe("店B")
  })

  it("必須 date が空の行はスキップされる", () => {
    const csv = "日付,店舗名,金額\n,店A,100\n2026/01/02,店B,200\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result).toHaveLength(1)
    expect(result[0].description).toBe("店B")
  })

  it("必須 amount が空の行はスキップされる", () => {
    const csv = "日付,店舗名,金額\n2026/01/01,店A,\n2026/01/02,店B,200\n"
    const result = parseCsv(utf8Buf(csv), simpleDefinition)

    expect(result).toHaveLength(1)
    expect(result[0].amount).toBe(200)
  })

  it("skipRows が反映される", () => {
    const def: CardCsvDefinition = { ...simpleDefinition, skipRows: 1 }
    const csv = "metadata line\n日付,店舗名,金額\n2026/01/01,店A,100\n"
    const result = parseCsv(utf8Buf(csv), def)

    expect(result).toHaveLength(1)
    expect(result[0].description).toBe("店A")
  })

  it("不正CSV（クォート崩れ）は例外を投げる", () => {
    const broken = "日付,店舗名,金額\n2026/01/01,\"店A,100\n"

    expect(() => parseCsv(utf8Buf(broken), simpleDefinition)).toThrow()
  })
})
