import { describe, expect, it } from "vitest";

import { timingSafeEqual } from "./timingSafeEqual";

describe("timingSafeEqual", () => {
  it("returns true for equal strings", async () => {
    expect(await timingSafeEqual("hello", "hello")).toBe(true);
  });

  it("returns false for unequal strings of same length", async () => {
    expect(await timingSafeEqual("hello", "world")).toBe(false);
  });

  it("returns false when lengths differ", async () => {
    expect(await timingSafeEqual("short", "longer-string")).toBe(false);
  });

  it("returns false for empty vs non-empty", async () => {
    expect(await timingSafeEqual("", "x")).toBe(false);
  });

  it("returns true for empty strings", async () => {
    expect(await timingSafeEqual("", "")).toBe(true);
  });

  it("returns false for strings differing only in one character", async () => {
    expect(await timingSafeEqual("Bearer abc123", "Bearer abc124")).toBe(false);
  });

  it("returns true for Bearer token with matching values", async () => {
    const token = "Bearer super-secret-key-value-xyz";
    expect(await timingSafeEqual(token, token)).toBe(true);
  });
});
