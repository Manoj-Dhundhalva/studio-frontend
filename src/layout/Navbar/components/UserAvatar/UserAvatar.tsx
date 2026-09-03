import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Skeleton, Tooltip } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useAppSelector } from "@/store";
import { REQUEST_STATUS, selectCurrentUser, selectUserStatus } from "@/store/slices/user.slice";
import { ROUTE_PATH } from "@/constants/route.constants";
import styles from "./UserAvatar.module.scss";

function UserAvatar() {
  const navigate = useNavigate();
  const user = useAppSelector(selectCurrentUser);
  const status = useAppSelector(selectUserStatus);

  const handleClick = () => {
    navigate(ROUTE_PATH.PROFILE.ROOT);
  };

  if (status === REQUEST_STATUS.LOADING) {
    return <Skeleton.Avatar active size={32} />;
  }

  return (
    <Tooltip title={user?.username ?? "Profile"}>
      <span
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleClick();
          }
        }}
        aria-label={user?.username ? `${user.username}'s profile` : "Profile"}
        data-testid="user-avatar"
      >
        <Avatar size={32} className={styles["avatar"] ?? ""} src={user?.avatarUrl} icon={<UserOutlined />} />
      </span>
    </Tooltip>
  );
}

export default memo(UserAvatar);
