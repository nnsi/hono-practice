import { describe, expect, it } from "vitest";

import {
  formatDateString,
  generateDateRange,
  getEndOfMonth,
} from "./dateUtils";

describe("formatDateString", () => {
  it("should format a Date to YYYY-MM-DD using UTC", () => {
    const date = new Date("2024-03-15T00:00:00Z");
    expect(formatDateString(date)).toBe("2024-03-15");
  });

  it("should use UTC date, not local time", () => {
    // UTC 2024-01-01 23:00 is still Jan 1 in UTC
    const date = new Date("2024-01-01T23:00:00Z");
    expect(formatDateString(date)).toBe("2024-01-01");
  });

  it("should pad month and day with zeros", () => {
    const date = new Date("2024-01-05T00:00:00Z");
    expect(formatDateString(date)).toBe("2024-01-05");
  });
});

describe("getEndOfMonth", () => {
  it("should return last day of January", () => {
    expect(getEndOfMonth("2024-01")).toBe("2024-01-31");
  });

  it("should return last day of February in a leap year", () => {
    expect(getEndOfMonth("2024-02")).toBe("2024-02-29");
  });

  it("should return last day of February in a non-leap year", () => {
    expect(getEndOfMonth("2023-02")).toBe("2023-02-28");
  });

  it("should return last day of December", () => {
    expect(getEndOfMonth("2024-12")).toBe("2024-12-31");
  });

  it("should return last day of April", () => {
    expect(getEndOfMonth("2024-04")).toBe("2024-04-30");
  });

  it("should work with YYYY-MM-DD format (uses year and month only)", () => {
    expect(getEndOfMonth("2024-03-15")).toBe("2024-03-31");
  });
});

describe("generateDateRange", () => {
  it("should return single date when from equals to", () => {
    expect(generateDateRange("2024-01-01", "2024-01-01")).toEqual([
      "2024-01-01",
    ]);
  });

  it("should return all dates in a range", () => {
    expect(generateDateRange("2024-01-01", "2024-01-03")).toEqual([
      "2024-01-01",
      "2024-01-02",
      "2024-01-03",
    ]);
  });

  it("should handle month boundary", () => {
    expect(generateDateRange("2024-01-30", "2024-02-02")).toEqual([
      "2024-01-30",
      "2024-01-31",
      "2024-02-01",
      "2024-02-02",
    ]);
  });

  it("should handle year boundary", () => {
    expect(generateDateRange("2023-12-31", "2024-01-02")).toEqual([
      "2023-12-31",
      "2024-01-01",
      "2024-01-02",
    ]);
  });

  it("should return empty array when from is after to", () => {
    expect(generateDateRange("2024-01-05", "2024-01-01")).toEqual([]);
  });
});
