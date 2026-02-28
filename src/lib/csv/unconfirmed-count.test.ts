import { describe, expect, it, vi } from "vitest"
import { recalcUnconfirmedCount } from "./unconfirmed-count"

describe("recalcUnconfirmedCount", () => {
  it("未確認件数を再計算してcsvImportを更新する", async () => {
    const mockCount = vi.fn().mockResolvedValue(3)
    const mockUpdate = vi.fn().mockResolvedValue({})

    const tx = {
      expense: { count: mockCount },
      csvImport: { update: mockUpdate },
    } as never

    await recalcUnconfirmedCount(tx, "import1")

    expect(mockCount).toHaveBeenCalledWith({
      where: { csvImportId: "import1", confirmed: false },
    })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "import1" },
      data: { unconfirmedCount: 3 },
    })
  })

  it("未確認件数が0の場合も正常に更新する", async () => {
    const mockCount = vi.fn().mockResolvedValue(0)
    const mockUpdate = vi.fn().mockResolvedValue({})

    const tx = {
      expense: { count: mockCount },
      csvImport: { update: mockUpdate },
    } as never

    await recalcUnconfirmedCount(tx, "import1")

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "import1" },
      data: { unconfirmedCount: 0 },
    })
  })
})
