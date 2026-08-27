import { memo } from "react";
import Logo from "./components/Logo";
import ThemeToggle from "./components/ThemeToggle";
import { Flex } from "antd";

function Navbar() {
  return (
    <Flex align="center" justify="space-between">
      <Logo />
      <ThemeToggle />
    </Flex>
  );
}

export default memo(Navbar);
