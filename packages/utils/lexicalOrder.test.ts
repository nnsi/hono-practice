import { describe, expect, it } from "vitest";

import { generateOrder } from "./lexicalOrder";

describe("generateOrder", () => {
  it("generates a random 8-char string when both prev and next are null", () => {
    const result = generateOrder(null, null);
    expect(result).toHaveLength(8);
    expect(result).toMatch(/^[a-z]{8}$/);
  });

  it("generates order after prev when next is null", () => {
    const result = generateOrder("abc", null);
    expect(result > "abc").toBe(true);
  });

  it("generates order before next when prev is null", () => {
    const result = generateOrder(null, "def");
    expect(result < "def").toBe(true);
  });

  it("generates order between prev and next", () => {
    const result = generateOrder("abc", "xyz");
    expect(result > "abc").toBe(true);
    expect(result < "xyz").toBe(true);
  });

  it("generates order between adjacent values", () => {
    const result = generateOrder("ab", "ac");
    expect(result > "ab").toBe(true);
    expect(result < "ac").toBe(true);
  });

  it("throws when prev >= next", () => {
    expect(() => generateOrder("xyz", "abc")).toThrow(
      "'prev' must be lexicographically less than 'next'",
    );
  });

  it("throws when prev equals next", () => {
    expect(() => generateOrder("abc", "abc")).toThrow(
      "'prev' must be lexicographically less than 'next'",
    );
  });

  it("maintains lexical ordering for sequential appends", () => {
    let prev: string | null = null;
    const orders: string[] = [];
    for (let i = 0; i < 20; i++) {
      const order = generateOrder(prev, null);
      orders.push(order);
      prev = order;
    }
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i] > orders[i - 1]).toBe(true);
    }
  });

  it("maintains lexical ordering for sequential prepends", () => {
    let next: string | null = null;
    const orders: string[] = [];
    for (let i = 0; i < 20; i++) {
      const order = generateOrder(null, next);
      orders.push(order);
      next = order;
    }
    orders.reverse();
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i] > orders[i - 1]).toBe(true);
    }
  });

  it("handles prev ending with z", () => {
    const result = generateOrder("abz", null);
    expect(result > "abz").toBe(true);
  });

  it("handles next ending with a", () => {
    const result = generateOrder(null, "aba");
    expect(result < "aba").toBe(true);
  });
});
