import { memo } from "react";
import { Button } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { THEME } from "@/constants/ui-preferences.constants";
import { useTheme } from "@/contexts/global";

function ThemeToggle() {
  const [theme, , toggleTheme] = useTheme();

  const isDark = theme === THEME.DARK;

  return (
    <Button
      color="default"
      shape="circle"
      variant="filled"
      icon={isDark ? <SunOutlined /> : <MoonOutlined />}
      onClick={toggleTheme}
    />
  );
}

export default memo(ThemeToggle);
