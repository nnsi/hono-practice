import { describe, expect, it } from "vitest";

import { str, strOrNull, toSqlBindable, toSyncStatus } from "./sqlRowHelpers";

describe("str", () => {
  it("returns empty string for undefined", () => {
    expect(str(undefined)).toBe("");
  });

  it("returns empty string for null", () => {
    expect(str(null)).toBe("");
  });

  it("returns empty string for number", () => {
    expect(str(123)).toBe("");
  });

  it("returns the string as-is", () => {
    expect(str("foo")).toBe("foo");
  });

  it("returns empty string for empty string", () => {
    expect(str("")).toBe("");
  });

  it("returns empty string for boolean", () => {
    expect(str(true)).toBe("");
  });
});

describe("strOrNull", () => {
  it("returns null for undefined", () => {
    expect(strOrNull(undefined)).toBeNull();
  });

  it("returns null for null", () => {
    expect(strOrNull(null)).toBeNull();
  });

  it("returns null for number", () => {
    expect(strOrNull(123)).toBeNull();
  });

  it("returns the string as-is", () => {
    expect(strOrNull("foo")).toBe("foo");
  });

  it("returns empty string for empty string", () => {
    expect(strOrNull("")).toBe("");
  });

  it("returns null for boolean", () => {
    expect(strOrNull(false)).toBeNull();
  });
});

describe("toSqlBindable", () => {
  it("returns null for null", () => {
    expect(toSqlBindable(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(toSqlBindable(undefined)).toBeNull();
  });

  it("returns string as-is", () => {
    expect(toSqlBindable("hello")).toBe("hello");
  });

  it("returns empty string as-is", () => {
    expect(toSqlBindable("")).toBe("");
  });

  it("returns number as-is", () => {
    expect(toSqlBindable(42)).toBe(42);
  });

  it("returns 0 as-is", () => {
    expect(toSqlBindable(0)).toBe(0);
  });

  it("converts true to 1", () => {
    expect(toSqlBindable(true)).toBe(1);
  });

  it("converts false to 0", () => {
    expect(toSqlBindable(false)).toBe(0);
  });

  it("converts object to String(value)", () => {
    expect(toSqlBindable({ a: 1 })).toBe("[object Object]");
  });

  it("converts array to String(value)", () => {
    expect(toSqlBindable([1, 2])).toBe("1,2");
  });
});

describe("toSyncStatus", () => {
  it("returns 'pending' for 'pending'", () => {
    expect(toSyncStatus("pending")).toBe("pending");
  });

  it("returns 'synced' for 'synced'", () => {
    expect(toSyncStatus("synced")).toBe("synced");
  });

  it("returns 'failed' for 'failed'", () => {
    expect(toSyncStatus("failed")).toBe("failed");
  });

  it("returns 'rejected' for 'rejected'", () => {
    expect(toSyncStatus("rejected")).toBe("rejected");
  });

  it("returns 'synced' as fallback for unknown string", () => {
    expect(toSyncStatus("unknown")).toBe("synced");
  });

  it("returns 'synced' as fallback for undefined", () => {
    expect(toSyncStatus(undefined)).toBe("synced");
  });

  it("returns 'synced' as fallback for null", () => {
    expect(toSyncStatus(null)).toBe("synced");
  });

  it("returns 'synced' as fallback for number", () => {
    expect(toSyncStatus(42)).toBe("synced");
  });
});
