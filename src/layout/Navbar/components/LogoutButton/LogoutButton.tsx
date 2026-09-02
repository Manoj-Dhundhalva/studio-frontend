import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Tooltip } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { authService } from "@/services/auth";
import { useAppDispatch } from "@/store";
import { resetUser } from "@/store/slices/user.slice";
import { ROUTE_PATH } from "@/constants/route.constants";

function LogoutButton() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    authService.clearToken();
    dispatch(resetUser());
    navigate(ROUTE_PATH.AUTH.LOGIN.ROOT, { replace: true });
  };

  return (
    <Tooltip title="Logout">
      <Button
        color="default"
        shape="circle"
        variant="filled"
        icon={<LogoutOutlined />}
        onClick={handleLogout}
        aria-label="Logout"
        data-testid="logout-button"
      />
    </Tooltip>
  );
}

export default memo(LogoutButton);
