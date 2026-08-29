import type { MessageInstance } from "antd/es/message/interface";

export class BrowserUtils {
  private static instance: BrowserUtils;

  private readonly toast: MessageInstance;

  private constructor(toast: MessageInstance) {
    this.toast = toast;
  }

  static getInstance(toast: MessageInstance): BrowserUtils {
    if (!BrowserUtils.instance) {
      BrowserUtils.instance = new BrowserUtils(toast);
    }
    return BrowserUtils.instance;
  }

  copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      this.toast.success("Copied to clipboard");
      return true;
    } catch {
      return this.copyViaExecCommand(text);
    }
  };

  private copyViaExecCommand = (text: string): boolean => {
    const textarea = document.createElement("textarea");

    try {
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);
      textarea.select();

      const success = document.execCommand("copy");

      if (success) {
        this.toast.success("Copied to clipboard");
      } else {
        this.toast.error("Failed to copy");
      }

      return success;
    } catch {
      this.toast.error("Failed to copy");
      return false;
    } finally {
      textarea.remove();
    }
  };
}
