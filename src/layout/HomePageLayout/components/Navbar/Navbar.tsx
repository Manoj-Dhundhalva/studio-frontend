import { memo } from "react";
import Logo from "./components/Logo";
import ThemeToggle from "./components/ThemeToggle";
import UserAvatar from "./components/UserAvatar";
import LogoutButton from "./components/LogoutButton";
import { Flex } from "antd";

function Navbar() {
  return (
    <Flex align="center" justify="space-between">
      <Logo />
      <Flex align="center" gap={12}>
        <UserAvatar />
        <ThemeToggle />
        <LogoutButton />
      </Flex>
    </Flex>
  );
}

export default memo(Navbar);
