import { UnauthorizedError } from "@backend/error";
import { describe, expect, it } from "vitest";

import { getAdminJwtSecret } from "../adminJwt";

describe("getAdminJwtSecret", () => {
  it("JWT_SECRET_ADMIN が設定されていれば返す", () => {
    const secret = getAdminJwtSecret({
      JWT_SECRET_ADMIN: "x".repeat(32),
    } as Parameters<typeof getAdminJwtSecret>[0]);
    expect(secret).toBe("x".repeat(32));
  });

  it("JWT_SECRET_ADMIN 未設定なら UnauthorizedError をスロー（メッセージは内部状態を漏らさない）", () => {
    expect(() =>
      getAdminJwtSecret({} as Parameters<typeof getAdminJwtSecret>[0]),
    ).toThrow(UnauthorizedError);
    expect(() =>
      getAdminJwtSecret({} as Parameters<typeof getAdminJwtSecret>[0]),
    ).toThrow("unauthorized");
  });

  it("JWT_SECRET_ADMIN が空文字列でも UnauthorizedError をスロー", () => {
    expect(() =>
      getAdminJwtSecret({
        JWT_SECRET_ADMIN: "",
      } as Parameters<typeof getAdminJwtSecret>[0]),
    ).toThrow(UnauthorizedError);
  });
});
