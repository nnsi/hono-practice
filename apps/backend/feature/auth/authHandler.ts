import type { LoginRequest } from "@dtos/request";
import { authResponseSchema } from "@dtos/response";

import { AppError, AuthError } from "../../error";

import type { AuthUsecase } from "./authUsecase";
import type { UserId } from "@backend/domain";

export interface AuthHandler {
  login(params: LoginRequest): Promise<{
    token: string;
    refreshToken: string;
  }>;
  refreshToken(token: string): Promise<{
    token: string;
    refreshToken: string;
  }>;
  logout(userId: UserId): Promise<{ message: string }>;
}

export function newAuthHandler(uc: AuthUsecase): AuthHandler {
  return {
    async login(params: LoginRequest) {
      const { accessToken, refreshToken } = await uc.login({
        loginId: params.login_id,
        password: params.password,
      });

      const parsedResponse = authResponseSchema.safeParse({
        token: accessToken,
        refreshToken,
      });

      if (!parsedResponse.success) {
        throw new AppError("loginHandler: failed to parse response", 500);
      }

      return parsedResponse.data;
    },

    async refreshToken(token: string) {
      try {
        const result = await uc.refreshToken(token);

        const parsedResponse = authResponseSchema.safeParse({
          token: result.accessToken,
          refreshToken: result.refreshToken,
        });

        if (!parsedResponse.success) {
          throw new AppError(
            "refreshTokenHandler: failed to parse response",
            500,
          );
        }

        return {
          token: parsedResponse.data.token,
          refreshToken: parsedResponse.data.refreshToken,
        };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "invalid refresh token"
        ) {
          throw new AuthError("invalid refresh token");
        }
        throw error;
      }
    },

    async logout(userId: UserId) {
      await uc.logout(userId);
      return { message: "success" };
    },
  };
}
