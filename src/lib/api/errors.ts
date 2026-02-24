// API エラークラス — throw して withApiHandler で捕捉する

import type { ErrorCode } from "@/lib/validations/common"

/** API処理中にthrowする統一エラークラス */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}
