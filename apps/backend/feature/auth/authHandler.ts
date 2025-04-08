import { loginRequestSchema } from "@dtos/request";

import type { AuthUsecase } from "./authUsecase";

export interface AuthHandler {
  login(params: { login_id: string; password: string }): Promise<{
    token: string;
    refreshToken: string;
    payload: { userId: string; exp: number };
    res: { token: string; refreshToken: string };
  }>;
  refreshToken(token: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }>;
  logout(userId: string): Promise<{ message: string }>;
}

export function newAuthHandler(uc: AuthUsecase): AuthHandler {
  return {
    async login(params) {
      const { login_id, password } = loginRequestSchema.parse(params);
      const { accessToken, refreshToken } = await uc.login(login_id, password);

      return {
        token: accessToken,
        refreshToken,
        payload: {
          userId: login_id,
          exp: Math.floor(Date.now() / 1000) + 15 * 60,
        },
        res: { token: accessToken, refreshToken },
      };
    },

    async refreshToken(token) {
      return await uc.refreshToken(token);
    },

    async logout(userId) {
      await uc.logout(userId);
      return { message: "success" };
    },
  };
}
