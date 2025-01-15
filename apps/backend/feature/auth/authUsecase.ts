import { sign } from "hono/jwt";

import { AuthError } from "@backend/error";
import bcrypt from "bcryptjs";

import type { UserRepository } from "../user";
import type { JwtPayload } from "@backend/context";
import type { User } from "@backend/domain";


export type AuthUsecase = {
  login: (login_id: string, password: string) => Promise<User>;
  getToken: (
    user: User,
    secret: string,
  ) => Promise<{ token: string; payload: JwtPayload }>;
};

export function newAuthUsecase(repo: UserRepository): AuthUsecase {
  return {
    login: login(repo),
    getToken: getToken(),
  };
}

function login(repo: UserRepository) {
  return async (login_id: string, password: string) => {
    const user = await repo.getUserByLoginId(login_id);
    if (!user) {
      throw new AuthError("invalid login id or password");
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new AuthError("invalid login id or password");
    }

    return user;
  };
}

function getToken() {
  return async (user: User, secret: string) => {
    const payload: JwtPayload = {
      id: user.id,
      exp: Math.floor(Date.now() / 1000) + 365 * 60 * 60,
    };

    const token = await sign(payload, secret);

    return { token, payload };
  };
}
