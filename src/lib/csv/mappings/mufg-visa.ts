// MUFG VISAカード CSVマッピング定義

import type { CardCsvDefinition } from "../types"

export const mufgVisaMapping: CardCsvDefinition = {
  id: "mufg_visa",
  name: "MUFG VISAカード",
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
      column: "ご利用先",
    },
    amount: {
      column: "ご利用金額（税込）",
      alternateColumns: ["ご利用金額"],
      type: "integer",
    },
    payment_method: {
      column: "利用区分",
    },
    installment_count: {
      column: null,
      extractFrom: "利用区分",
      pattern: "分割(\\d+)回",
    },
    memo: {
      column: null,
    },
  },
  notes: "My Digital Connectからダウンロード。",
}
