import { testDB } from "@backend/test.setup";
import { adminSessions } from "@infra/drizzle/schema";
import { beforeEach, describe, expect, it } from "vitest";

import { newAdminSessionRepository } from "../adminSessionRepository";

describe("admin session repository", () => {
  beforeEach(async () => {
    await testDB.delete(adminSessions);
  });

  it("finds an active session and hides it after revocation", async () => {
    const repository = newAdminSessionRepository(testDB);
    const created = await repository.createAdminSession(
      "admin@example.com",
      "Admin",
      new Date(Date.now() + 60_000),
    );

    await expect(
      repository.findActiveAdminSessionByToken(created.token),
    ).resolves.toEqual(
      expect.objectContaining({ email: "admin@example.com", name: "Admin" }),
    );

    await repository.revokeAdminSessionByToken(created.token);
    await expect(
      repository.findActiveAdminSessionByToken(created.token),
    ).resolves.toBeUndefined();
  });

  it("does not return an expired session", async () => {
    const repository = newAdminSessionRepository(testDB);
    const created = await repository.createAdminSession(
      "admin@example.com",
      "Admin",
      new Date(Date.now() - 1),
    );

    await expect(
      repository.findActiveAdminSessionByToken(created.token),
    ).resolves.toBeUndefined();
  });
});
