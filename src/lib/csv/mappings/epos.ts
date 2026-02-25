// エポスカード CSVマッピング定義

import type { CardCsvDefinition } from "../types"

export const eposMapping: CardCsvDefinition = {
  id: "epos",
  name: "エポスカード",
  encoding: "Shift_JIS",
  skipRows: 0,
  hasHeader: true,
  delimiter: ",",
  mapping: {
    date: {
      column: "ご利用日",
      format: "YYYY/MM/DD",
    },
    description: {
      column: "ご利用先・商品名",
    },
    amount: {
      column: "ご利用金額",
      type: "integer",
    },
    payment_method: {
      column: "お支払区分",
    },
    memo: {
      column: "備考",
    },
  },
  notes: "PCのみCSVダウンロード可。月別ご利用履歴照会から取得。",
}
