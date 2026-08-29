import { useEffect } from "react";
import { App } from "antd";
import { ToastUtils } from "@/utils/toast.utils";

export const useToast = () => {
  const { message } = App.useApp();

  useEffect(() => {
    ToastUtils.initialize(message);
  }, [message]);

  return null;
};
