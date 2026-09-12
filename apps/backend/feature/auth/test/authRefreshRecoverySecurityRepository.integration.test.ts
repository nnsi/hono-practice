import { hashWithSHA256 } from "@backend/lib/hash";
import { testDB } from "@backend/test.setup";
import { refreshTokens, users } from "@infra/drizzle/schema";
import { createRefreshToken } from "@packages/domain/auth/refreshTokenSchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { eq } from "drizzle-orm";
import { v7 } from "uuid";
import { describe, expect, it } from "vitest";

import { recoveryFixture } from "./authRefreshRecovery.setup";

describe("refresh recovery authentication and revocation", () => {
  it("rejects another operation and legacy branching from a modern parent", async () => {
    const f = await recoveryFixture();
    const first = await f.rotate(f.combined, f.operation);
    await expect(f.rotate(f.combined, crypto.randomUUID())).rejects.toThrow(
      "invalid refresh token",
    );
    await expect(f.rotate(f.combined)).rejects.toThrow("invalid refresh token");
    const recovered = await f.rotate(f.combined, f.operation);
    expect(recovered.refreshToken === first.refreshToken).toBe(true);
    expect(await f.rows()).toHaveLength(2);
  });

  it.each([
    "same-user",
    "another-user",
  ])("allows a fresh nonce only for a current credential with another family's operation (%s)", async (owner) => {
    const f = await recoveryFixture();
    await f.rotate(f.combined, f.operation);
    const userId = owner === "same-user" ? f.userId : createUserId();
    if (owner === "another-user")
      await testDB
        .insert(users)
        .values({ id: userId, loginId: "other-recovery-user" });
    const plain = v7();
    const other = await f.repo.createRefreshToken(
      createRefreshToken({
        userId,
        selector: v7(),
        token: await hashWithSHA256(plain),
        expiresAt: f.parent.expiresAt,
      }),
    );
    await expect(
      f.rotate(`${other.selector}.${plain}`, f.operation),
    ).rejects.toMatchObject({
      status: 409,
      message: "refresh operation conflict",
    });
    expect(f.collector.snapshot()).toMatchObject({
      reason: "operation_mismatch",
      rotationCommitted: false,
    });
    const rows = await f.rows();
    expect(rows).toHaveLength(3);
    expect(rows.find((row) => row.id === other.id)).toMatchObject({
      rotatedAt: null,
      rotationOperationHash: null,
      rotationChildId: null,
    });
    await expect(
      f.rotate(`${f.parent.selector}.${v7()}`, f.operation),
    ).rejects.toThrow("invalid refresh token");
    expect(f.collector.snapshot().reason).toBe("hash_mismatch");
    const freshOperation = crypto.randomUUID();
    await expect(
      f.rotate(`${other.selector}.${plain}`, freshOperation),
    ).resolves.toMatchObject({ userId });
    expect(await f.rows()).toHaveLength(4);
    // Both consumed parents reject a different known operation instead of
    // allowing the client to discard the required recovery proof.
    await expect(f.rotate(f.combined, freshOperation)).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      f.rotate(`${other.selector}.${plain}`, f.operation),
    ).rejects.toMatchObject({ status: 401 });
  });

  it.each([
    "revoked",
    "deleted",
    "expired",
  ])("does not offer nonce replacement for a %s credential", async (state) => {
    const f = await recoveryFixture();
    const first = await f.rotate(f.combined, f.operation);
    const second = await f.rotate(first.refreshToken, crypto.randomUUID());
    // The grandchild is outside the old operation's parent/child pair. It
    // would qualify for 409 while current, but never after invalidation.
    await testDB
      .update(refreshTokens)
      .set({
        ...(state === "revoked" ? { revokedAt: new Date() } : {}),
        ...(state === "deleted" ? { deletedAt: new Date() } : {}),
        ...(state === "expired"
          ? { expiresAt: new Date(Date.now() - 1000) }
          : {}),
      })
      .where(eq(refreshTokens.selector, second.refreshToken.split(".")[0]));
    await expect(
      f.rotate(second.refreshToken, f.operation),
    ).rejects.toMatchObject({ status: 401 });
    expect(f.collector.snapshot().reason).toBe(state);
    expect(await f.rows()).toHaveLength(3);
  });

  it.each([
    "rotated",
    "revoked",
    "deleted",
    "expired",
  ])("never resurrects a child that is %s", async (state) => {
    const f = await recoveryFixture();
    const first = await f.rotate(f.combined, f.operation);
    if (state === "rotated")
      await f.rotate(first.refreshToken, crypto.randomUUID());
    else {
      await testDB
        .update(refreshTokens)
        .set({
          ...(state === "revoked" ? { revokedAt: new Date() } : {}),
          ...(state === "deleted" ? { deletedAt: new Date() } : {}),
          ...(state === "expired"
            ? { expiresAt: new Date(Date.now() - 1000) }
            : {}),
        })
        .where(eq(refreshTokens.selector, first.refreshToken.split(".")[0]));
    }
    await expect(f.rotate(f.combined, f.operation)).rejects.toThrow(
      "invalid refresh token",
    );
    expect(f.collector.snapshot().reason).toBe("recovery_closed");
    await expect(f.rotate(first.refreshToken, f.operation)).rejects.toThrow(
      "invalid refresh token",
    );
  });

  it("logout with the parent revokes all descendants while keeping another family", async () => {
    const f = await recoveryFixture();
    const first = await f.rotate(f.combined, f.operation);
    const second = await f.rotate(first.refreshToken, crypto.randomUUID());
    const other = await f.repo.createRefreshToken(
      createRefreshToken({
        userId: f.userId,
        selector: v7(),
        token: await hashWithSHA256(v7()),
        expiresAt: f.parent.expiresAt,
      }),
    );
    await f.logout(f.userId, f.combined);
    const rows = await f.rows();
    expect(
      rows
        .filter((row) => row.familyId === f.parent.id)
        .every((row) => row.revokedAt !== null),
    ).toBe(true);
    expect(rows.find((row) => row.id === other.id)?.revokedAt).toBeNull();
    await expect(
      f.rotate(second.refreshToken, crypto.randomUUID()),
    ).rejects.toThrow("invalid refresh token");
    await expect(f.rotate(f.combined, f.operation)).rejects.toThrow(
      "invalid refresh token",
    );
    await expect(f.logout(f.userId, f.combined)).resolves.toBeUndefined();
  });

  it.each([
    "rotation-first",
    "logout-first",
  ])("serializes rotation and logout without leaving a live child (%s)", async (order) => {
    const f = await recoveryFixture();
    const rotate = () => f.rotate(f.combined, f.operation);
    const logout = () => f.logout(f.userId, f.combined);
    const actions =
      order === "rotation-first" ? [rotate, logout] : [logout, rotate];
    const results = await Promise.allSettled(actions.map((action) => action()));
    expect(results[order === "rotation-first" ? 1 : 0].status).toBe(
      "fulfilled",
    );
    expect((await f.rows()).every((row) => row.revokedAt !== null)).toBe(true);
    await expect(rotate()).rejects.toThrow("invalid refresh token");
  });

  it("does not recover after account deletion or revoke-all", async () => {
    const f = await recoveryFixture();
    await f.rotate(f.combined, f.operation);
    await f.repo.revokeRefreshTokenAllByUserId(f.userId);
    await expect(f.rotate(f.combined, f.operation)).rejects.toThrow(
      "invalid refresh token",
    );
    await testDB.update(refreshTokens).set({ revokedAt: null });
    await testDB
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, f.userId));
    await expect(f.rotate(f.combined, f.operation)).rejects.toThrow(
      "invalid refresh token",
    );
    expect(f.collector.snapshot().reason).toBe("user_not_found");
  });
});
