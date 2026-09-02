import { memo } from "react";
import Logo from "./components/Logo";
import ProjectTitle from "./components/ProjectTitle";
import ThemeToggle from "./components/ThemeToggle";
import ProjectMembersPanel from "./components/ProjectMembersPanel";
import UserAvatar from "./components/UserAvatar";
import LogoutButton from "./components/LogoutButton";
import { Flex } from "antd";

function Navbar() {
  return (
    <Flex align="center" justify="space-between">
      <Flex align="center" gap={12}>
        <Logo />
        <ProjectTitle />
      </Flex>
      <Flex align="center" gap={12}>
        <UserAvatar />
        <ProjectMembersPanel />
        <ThemeToggle />
        <LogoutButton />
      </Flex>
    </Flex>
  );
}

export default memo(Navbar);
