import { setCookie } from "hono/cookie";

import { CreateUserRequest } from "@/types/request";
import { GetUserResponseSchema } from "@/types/response/";

import { HonoContext } from "../../context";
import { AppError } from "../../error";
import { UserUsecase } from "../../usecase";

export function newUserHandler(uc: UserUsecase) {
  return {
    createUser: createUser(uc),
    getMe: getMe(uc),
  };
}

function createUser(uc: UserUsecase) {
  return async (c: HonoContext) => {
    const json = await c.req.json<CreateUserRequest>();

    const token = await uc.createUser(json);

    setCookie(c, "auth", token, {
      httpOnly: true,
    });

    return c.body(null, 204);
  };
}

function getMe(uc: UserUsecase) {
  return async (c: HonoContext) => {
    const userId = c.get("jwtPayload").id;
    const user = await uc.getUserById(userId);

    const parsedUser = GetUserResponseSchema.safeParse(user);
    if (!parsedUser.success) {
      throw new AppError("failed to parse user", 500);
    }

    return c.json(parsedUser.data, 200);
  };
}
