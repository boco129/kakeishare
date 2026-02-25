// MUFG JCBカード CSVマッピング定義

import type { CardCsvDefinition } from "../types"

export const mufgJcbMapping: CardCsvDefinition = {
  id: "mufg_jcb",
  name: "MUFG JCBカード",
  encoding: "Shift_JIS",
  skipRows: 0,
  hasHeader: true,
  delimiter: ",",
  mapping: {
    date: {
      column: "ご利用年月日",
      format: "YYYY/MM/DD",
    },
    description: {
      column: "ご利用先など",
    },
    amount: {
      column: "ご利用金額",
      type: "integer",
    },
    payment_method: {
      column: "お支払区分",
    },
    installment_count: {
      column: null,
      extractFrom: "お支払区分",
      pattern: "^(\\d+)回$",
    },
    memo: {
      column: null,
    },
  },
  notes: "MyJCBから確定分をダウンロード。最長15ヵ月分。",
}
