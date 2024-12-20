import { sign } from "hono/jwt";

import { config } from "@/backend/config";
import { JwtPayload } from "@/backend/context";
import { User } from "@/backend/domain";

export type AuthUsecase = {
  getToken: (user: User) => Promise<{ token: string; payload: JwtPayload }>;
};

export function newAuthUsecase(): AuthUsecase {
  return {
    getToken: getToken(),
  };
}

function getToken() {
  return async (user: User) => {
    const payload: JwtPayload = {
      id: user.id,
      exp: Math.floor(Date.now() / 1000) + 365 * 60 * 60,
    };

    const token = await sign(payload, config.JWT_SECRET);

    return { token, payload };
  };
}
