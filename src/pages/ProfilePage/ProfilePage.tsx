import { memo, useEffect } from "react";
import { Avatar, Button, Flex, Form, Input, Skeleton, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  REQUEST_STATUS,
  fetchCurrentUser,
  selectCurrentUser,
  selectUserStatus,
  updateUsername as updateUsernameThunk,
} from "@/store/slices/user.slice";
import { UsernameSchema } from "@/services/users/users.types";
import { utils } from "@/utils";
import styles from "./ProfilePage.module.scss";

type TProfileFormValues = {
  username: string;
};

function validateUsername(_: unknown, value: string) {
  const result = UsernameSchema.safeParse(value);
  return result.success ? Promise.resolve() : Promise.reject(new Error(result.error.issues[0]?.message));
}

function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const status = useAppSelector(selectUserStatus);
  const [form] = Form.useForm<TProfileFormValues>();

  const isInitialLoading = status === REQUEST_STATUS.LOADING && !user;
  const isSaving = status === REQUEST_STATUS.LOADING && user !== null;

  useEffect(() => {
    if (status === REQUEST_STATUS.IDLE) {
      void dispatch(fetchCurrentUser());
    }
  }, [status, dispatch]);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({ username: user.username });
    }
  }, [user, form]);

  const handleFinish = async (values: TProfileFormValues) => {
    try {
      await dispatch(updateUsernameThunk(values.username)).unwrap();
      utils.toast.success("Username updated successfully.");
    } catch {
      utils.toast.error("Failed to update username. Please try again.");
    }
  };

  if (isInitialLoading) {
    return <Skeleton active className={styles["profile-page"] ?? ""} />;
  }

  return (
    <div className={styles["profile-page"]}>
      <Typography.Title level={3}>Profile</Typography.Title>

      <Flex justify="center" className={styles["avatar-wrapper"] ?? ""}>
        <Avatar size={96} src={user?.avatarUrl} icon={<UserOutlined />} data-testid="profile-avatar" />
      </Flex>

      <Form form={form} layout="vertical" onFinish={handleFinish} className={styles["form"]}>
        <Form.Item label="Email">
          <Typography.Text type="secondary">{user?.email}</Typography.Text>
        </Form.Item>

        <Form.Item
          label="Username"
          name="username"
          rules={[{ required: true, message: "Username is required" }, { validator: validateUsername }]}
        >
          <Input placeholder="Enter your username" data-testid="username-input" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSaving} data-testid="save-username">
            Save changes
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

export default memo(ProfilePage);
