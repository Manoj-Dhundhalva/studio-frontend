import type { MessageInstance } from "antd/es/message/interface";

export class ToastUtils {
  private static instance: ToastUtils | null = null;

  private readonly message: MessageInstance;

  private constructor(message: MessageInstance) {
    this.message = message;
  }

  static initialize(message: MessageInstance): void {
    if (!ToastUtils.instance) {
      ToastUtils.instance = new ToastUtils(message);
    }
  }

  static getInstance(): MessageInstance {
    if (!ToastUtils.instance) {
      throw new Error("ToastUtils has not been initialized. Call ToastUtils.initialize(message) first.");
    }

    return ToastUtils.instance.message;
  }
}
