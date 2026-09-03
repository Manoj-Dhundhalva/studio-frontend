import { memo } from "react";
import { useParams } from "react-router-dom";
import Logo from "./components/Logo";
import ProjectTitle from "./components/ProjectTitle";
import ThemeToggle from "./components/ThemeToggle";
import ProjectMembersPanel from "./components/ProjectMembersPanel";
import PresenceBar from "./components/PresenceBar";
import UserAvatar from "./components/UserAvatar";
import LogoutButton from "./components/LogoutButton";
import { Flex } from "antd";
import { useAppSelector } from "@/store";
import { selectProject } from "@/store/slices/project.slice";
import { PROJECT_ROLE } from "@/services/projects/projects.types";
import ViewerNotice from "@/pages/ProjectPage/components/ViewerNotice";
import ExportPopover from "@/pages/ProjectPage/components/ExportPopover";

function Navbar() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useAppSelector((state) => (projectId ? selectProject(state, projectId) : null));
  const isViewer = project !== null && project.accessibility === PROJECT_ROLE.VIEWER;

  return (
    <Flex align="center" justify="space-between">
      <Flex align="center" gap={12}>
        <Logo />
        <ProjectTitle />
      </Flex>
      <Flex align="center" gap={12}>
        {/* Live editors first, then the roster/permissions panel — presence is
            a separate, ephemeral concern from project membership. */}
        <PresenceBar />
        {isViewer && <ViewerNotice />}
        {projectId && <ExportPopover projectId={projectId} />}
        {!projectId && <UserAvatar />}
        <ProjectMembersPanel />
        <ThemeToggle />
        <LogoutButton />
      </Flex>
    </Flex>
  );
}

export default memo(Navbar);
