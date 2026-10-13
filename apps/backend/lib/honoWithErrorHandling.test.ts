import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { describe, expect, it } from "vitest";

describe("hono error response", () => {
  function app() {
    return newHonoWithErrorHandling().get("/boom", () => {
      throw new Error("secret detail");
    });
  }

  it.each([
    "stg",
    "production",
  ] as const)("%s does not expose a stack trace", async (nodeEnv) => {
    const response = await app().request("/boom", {}, { NODE_ENV: nodeEnv });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      message: "internal server error",
    });
  });

  it("maps a postgres unique violation wrapped by drizzle to 409", async () => {
    const wrapped = new Error("Failed query", {
      cause: Object.assign(new Error("duplicate key"), {
        code: "23505",
        constraint: "activity_log_pkey",
      }),
    });
    const response = await newHonoWithErrorHandling()
      .get("/dup", () => {
        throw wrapped;
      })
      .request("/dup", {}, { NODE_ENV: "production" });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: "conflict" });
  });

  it("keeps stack traces available in local tests", async () => {
    const response = await app().request("/boom", {}, { NODE_ENV: "test" });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      message: "internal server error",
      stack: expect.stringContaining("secret detail"),
    });
  });
});
