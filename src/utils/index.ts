import { BrowserUtils } from "./browser.utils";
import { DateUtils } from "./date.utils";
import { ToastUtils } from "./toast.utils";
import type { MessageInstance } from "antd/es/message/interface";

class Utils {
  private static instance: Utils;

  public toast: MessageInstance;
  public date: DateUtils;
  public browser: BrowserUtils;

  private constructor() {
    this.toast = ToastUtils.getInstance();
    this.date = DateUtils.getInstance();
    this.browser = BrowserUtils.getInstance(ToastUtils.getInstance());
  }

  static getInstance(): Utils {
    if (!Utils.instance) {
      Utils.instance = new Utils();
    }
    return Utils.instance;
  }
}

export const utils = Utils.getInstance();
