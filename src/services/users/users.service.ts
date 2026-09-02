import { api } from "@/services/api";
import { UserSchema, type TUser } from "./users.types";

class UsersService {
  private static instance: UsersService;

  private constructor() {}

  static getInstance(): UsersService {
    if (!UsersService.instance) {
      UsersService.instance = new UsersService();
    }
    return UsersService.instance;
  }

  getCurrentUser = async (): Promise<TUser> => {
    const { data } = await api.get("/users/me");
    return UserSchema.parse(data);
  };

  updateUsername = async (username: string): Promise<TUser> => {
    const { data } = await api.patch("/users/me/username", { username });
    return UserSchema.parse(data);
  };
}

export const usersService = UsersService.getInstance();
