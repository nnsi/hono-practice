import { testDB } from "@backend/test.setup";
import { refreshTokens } from "@infra/drizzle/schema";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RefreshTokenRepository } from "../refreshTokenRepository";
import { recoveryFixture } from "./authRefreshRecovery.setup";

describe("durable refresh operation recovery", () => {
  afterEach(() => vi.useRealTimers());

  it("twenty concurrent retries create one child and return the same credential", async () => {
    const f = await recoveryFixture();
    const responses = await Promise.all(
      Array.from({ length: 20 }, () => f.rotate(f.combined, f.operation)),
    );
    expect(
      new Set(responses.map((response) => response.refreshToken)).size,
    ).toBe(1);
    const rows = await f.rows();
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.familyId === f.parent.id)).toBe(true);
    const parent = rows.find((row) => row.id === f.parent.id);
    const child = rows.find((row) => row.id !== f.parent.id);
    expect(parent?.rotationChildId === child?.id).toBe(true);
    expect(parent?.rotationRecoveryExpiresAt).toEqual(f.parent.expiresAt);
    expect(JSON.stringify(rows).includes(f.operation)).toBe(false);
    expect(
      JSON.stringify(rows).includes(responses[0].refreshToken.split(".")[1]),
    ).toBe(false);
  });

  it.each([
    48_000,
    12 * 60 * 60 * 1000,
  ])("recovers a lost response after %i ms without extending either expiry", async (elapsed) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.now();
    const f = await recoveryFixture();
    const first = await f.rotate(f.combined, f.operation);
    vi.setSystemTime(start + elapsed);
    const recovered = await f.rotate(f.combined, f.operation);
    expect(recovered.refreshToken === first.refreshToken).toBe(true);
    expect(recovered.refreshTokenExpiresAt).toEqual(
      first.refreshTokenExpiresAt,
    );
    expect(await f.rows()).toHaveLength(2);
    expect(f.collector.snapshot()).toMatchObject({
      reason: "operation_replayed",
      rotationCommitted: true,
    });
  });

  it("ACKs a saved child with the old operation without rotating it again", async () => {
    const f = await recoveryFixture();
    const first = await f.rotate(f.combined, f.operation);
    const response = await f.rotate(first.refreshToken, f.operation);
    expect(response.refreshToken === first.refreshToken).toBe(true);
    expect(await f.rows()).toHaveLength(2);
  });

  it("keeps a valid child ACK usable after parent expiry and cleanup, but closes parent recovery", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = Date.now();
    const f = await recoveryFixture(new Date(now + 1000));
    const first = await f.rotate(f.combined, f.operation);
    vi.setSystemTime(now + 48_000);
    await expect(f.rotate(f.combined, f.operation)).rejects.toThrow(
      "invalid refresh token",
    );
    const beforeCleanup = await f.rotate(first.refreshToken, f.operation);
    expect(beforeCleanup.refreshToken === first.refreshToken).toBe(true);
    await f.repo.deleteRefreshTokensPastExpiry();
    const afterCleanup = await f.rotate(first.refreshToken, f.operation);
    expect(afterCleanup.refreshToken === first.refreshToken).toBe(true);
    expect(afterCleanup.refreshTokenExpiresAt).toEqual(
      first.refreshTokenExpiresAt,
    );
  });

  it("retains fixed parent recovery expiry even if parent data is extended later", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const now = Date.now();
    const f = await recoveryFixture(new Date(now + 1000));
    await f.rotate(f.combined, f.operation);
    await testDB
      .update(refreshTokens)
      .set({ expiresAt: new Date(now + 86_400_000) })
      .where(eq(refreshTokens.id, f.parent.id));
    vi.setSystemTime(now + 48_000);
    await expect(f.rotate(f.combined, f.operation)).rejects.toThrow(
      "invalid refresh token",
    );
    expect(f.collector.snapshot().reason).toBe("recovery_expired");
  });

  it("rolls back the operation and parent consumption if child INSERT fails", async () => {
    const f = await recoveryFixture();
    const failing: RefreshTokenRepository = {
      ...f.repo,
      withTx: (tx) => {
        const repository = f.repo.withTx(tx);
        return {
          ...repository,
          createRefreshToken: (token) =>
            repository.createRefreshToken({
              ...token,
              selector: f.parent.selector,
            }),
        };
      },
    };
    await expect(
      f.createRotate(failing)(f.combined, f.operation),
    ).rejects.toThrow();
    const rows = await f.rows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      rotatedAt: null,
      rotationOperationHash: null,
      rotationChildId: null,
      rotationRecoveryExpiresAt: null,
    });
    await expect(f.rotate(f.combined, f.operation)).resolves.toMatchObject({
      userId: f.userId,
    });
  });

  it("treats a recovery-key change as transient while an already saved child can ACK", async () => {
    const f = await recoveryFixture();
    const first = await f.rotate(f.combined, f.operation);
    const changedKey = f.createRotate(f.repo, "different-secret");
    await expect(changedKey(f.combined, f.operation)).rejects.toMatchObject({
      status: 503,
    });
    const recovered = await f.rotate(f.combined, f.operation);
    expect(recovered.refreshToken === first.refreshToken).toBe(true);
    const ack = await changedKey(first.refreshToken, f.operation);
    expect(ack.refreshToken === first.refreshToken).toBe(true);
    expect(await f.rows()).toHaveLength(2);
  });

  it("upgrades the remaining legacy grace rescue to a recoverable operation", async () => {
    const f = await recoveryFixture();
    await f.rotate(f.combined);
    const first = await f.rotate(f.combined, f.operation);
    const recovered = await f.rotate(f.combined, f.operation);
    expect(recovered.refreshToken === first.refreshToken).toBe(true);
    await expect(f.rotate(f.combined)).rejects.toThrow("invalid refresh token");
    expect(await f.rows()).toHaveLength(3);
  });
});
