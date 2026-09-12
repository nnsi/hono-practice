import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle";
import { hashWithSHA256 } from "@backend/lib/hash";
import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { loggerMiddleware } from "@backend/middleware/loggerMiddleware";
import { testDB } from "@backend/test.setup";
import { REFRESH_OPERATION_HEADER } from "@packages/types/authRefresh";
import { afterEach, describe, expect, it, vi } from "vitest";

import { newUserRepository } from "../../user/userRepository";
import { newAuthHandler } from "../authHandler";
import { rotateRefreshToken } from "../authRefreshUsecase";
import {
  type RefreshTokenRepository,
  newRefreshTokenRepository,
} from "../refreshTokenRepository";
import { recoveryFixture } from "./authRefreshRecovery.setup";

vi.mock("@backend/middleware/localLogWriter", () => ({
  appendLocalLog: vi.fn(),
}));

describe("refresh failures at the request logging boundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    "insert",
    "enrichment",
  ])("keeps SQL parameters and recovery secrets out of %s failure logs and responses", async (failure) => {
    const f = await recoveryFixture();
    const operationHash = await hashWithSHA256(
      `actiko/refresh-operation/id/v1\n${f.operation}`,
    );
    const output = [
      vi.spyOn(console, "log").mockImplementation(() => {}),
      vi.spyOn(console, "warn").mockImplementation(() => {}),
      vi.spyOn(console, "error").mockImplementation(() => {}),
    ];
    const wae = { writeDataPoint: vi.fn() };
    const app = newHonoWithErrorHandling();
    let originalErrorContainedParameters = false;
    app.use("*", loggerMiddleware());
    app.post("/auth/token", async (c) => {
      const observer = c.get("authDiagnostics")?.observe;
      const base = newRefreshTokenRepository(testDB, c.get("logger"), observer);
      const repository: RefreshTokenRepository = {
        ...base,
        withTx: (tx) => {
          const transactional = base.withTx(tx);
          return {
            ...transactional,
            createRefreshToken: async (child) => {
              if (failure !== "insert")
                return transactional.createRefreshToken(child);
              try {
                // An actual Drizzle INSERT fails its unique constraint after
                // recording the operation. Its SQL params contain both canaries.
                return await transactional.createRefreshToken({
                  ...child,
                  selector: f.parent.selector,
                  rotationOperationHash: operationHash,
                });
              } catch (error) {
                originalErrorContainedParameters =
                  error instanceof Error &&
                  error.message.includes(operationHash) &&
                  error.message.includes(f.parent.selector);
                throw error;
              }
            },
          };
        },
      };
      const rotate = rotateRefreshToken(
        repository,
        newUserRepository(testDB),
        newDrizzleTransactionRunner(testDB),
        "test-secret",
        "test-audience",
        c.get("tracer"),
        observer,
      );
      const unavailable = async (): Promise<never> => {
        throw new Error(
          `SQL params: ${operationHash} ${f.parent.selector} ${f.operation}`,
        );
      };
      if (failure === "enrichment") {
        const handler = newAuthHandler(
          {
            login: unavailable,
            rotateRefreshToken: rotate,
            logout: unavailable,
            loginWithProvider: unavailable,
            linkProvider: unavailable,
          },
          unavailable,
          unavailable,
          observer,
        );
        await handler.rotateRefreshToken(f.combined, f.operation);
      } else await rotate(f.combined, f.operation);
      return c.json({ message: "unexpected success" });
    });
    const response = await app.request(
      "/auth/token",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${f.combined}`,
          [REFRESH_OPERATION_HEADER]: f.operation,
        },
      },
      {
        NODE_ENV: "test",
        APP_URL: "https://actiko.app",
        DB: testDB,
        JWT_SECRET: "test-secret",
        JWT_AUDIENCE: "test-audience",
        WAE_LOGS: wae,
      },
      { waitUntil: vi.fn(), passThroughOnException: vi.fn(), props: {} },
    );
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({ message: "refresh temporarily unavailable" });
    expect(wae.writeDataPoint).toHaveBeenCalledOnce();
    const serialized = JSON.stringify({
      body,
      console: output.map((spy) => spy.mock.calls),
      wae: wae.writeDataPoint.mock.calls,
    });
    expect(serialized.includes("Request error")).toBe(true);
    for (const secret of [
      f.operation,
      operationHash,
      f.parent.selector,
      f.parent.token,
      f.combined.split(".")[1],
      "SQL params:",
    ]) {
      expect(serialized.includes(secret)).toBe(false);
    }
    const rows = await f.rows();
    if (failure === "insert") {
      expect(originalErrorContainedParameters).toBe(true);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        rotatedAt: null,
        rotationOperationHash: null,
        rotationChildId: null,
      });
    } else expect(rows).toHaveLength(2);
    await expect(f.rotate(f.combined, f.operation)).resolves.toMatchObject({
      userId: f.userId,
    });
    expect(await f.rows()).toHaveLength(2);
  });
});
