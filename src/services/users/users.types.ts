import { z } from "zod";

export const UserSchema = z.object({
  userId: z.string(),
  username: z.string(),
  email: z.email(),
  avatarUrl: z.url().nullable(),
});

export type TUser = z.infer<typeof UserSchema>;

export const UsernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters");

export const SearchUserSchema = z.object({
  userId: z.string(),
  avatar: z.url().nullable(),
  username: z.string(),
  email: z.email(),
});

export type TSearchUser = z.infer<typeof SearchUserSchema>;

export const SearchUsersResponseSchema = z.object({
  users: z.array(SearchUserSchema),
});
