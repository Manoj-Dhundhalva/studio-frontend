import { getAntdStatic } from "@/lib/antd-static";

/**
 * Uses antd's context-aware message instance so feedback matches the active
 * theme. Falls back to a console warning if called before the app has mounted.
 */
function notify(type: "success" | "error", content: string): void {
  const antd = getAntdStatic();

  if (!antd) {
    console.warn(`[notify:${type}] ${content}`);
    return;
  }

  antd.message[type](content);
}

export class BrowserUtils {
  private static instance: BrowserUtils;

  private constructor() {}

  static getInstance(): BrowserUtils {
    if (!BrowserUtils.instance) {
      BrowserUtils.instance = new BrowserUtils();
    }
    return BrowserUtils.instance;
  }

  copyToClipboard = async (text: string): Promise<boolean> => {
    // The async Clipboard API is unavailable on insecure origins and in some
    // webviews, hence the execCommand fallback.
    try {
      await navigator.clipboard.writeText(text);
      notify("success", "Copied to clipboard");
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

      notify(success ? "success" : "error", success ? "Copied to clipboard" : "Failed to copy");

      return success;
    } catch {
      notify("error", "Failed to copy");
      return false;
    } finally {
      textarea.remove();
    }
  };
}
