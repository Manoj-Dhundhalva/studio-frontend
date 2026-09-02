import { BrowserUtils } from "./browser.utils";
import { DateUtils } from "./date.utils";
import { ToastUtils } from "./toast.utils";
import type { MessageInstance } from "antd/es/message/interface";

class Utils {
  private static instance: Utils;

  public readonly date: DateUtils;

  private constructor() {
    this.date = DateUtils.getInstance();
  }

  static getInstance(): Utils {
    if (!Utils.instance) {
      Utils.instance = new Utils();
    }
    return Utils.instance;
  }

  /**
   * Resolved lazily (not cached in the constructor) since `Utils` is
   * instantiated as an eager module-level singleton, which can run before
   * `ToastUtils.initialize()` fires from `useToast()`'s effect.
   */
  get toast(): MessageInstance {
    return ToastUtils.getInstance();
  }

  get browser(): BrowserUtils {
    return BrowserUtils.getInstance(ToastUtils.getInstance());
  }
}

export const utils = Utils.getInstance();
