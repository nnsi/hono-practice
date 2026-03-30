import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  daysInMonth,
  getEndOfMonth,
  getStartOfMonth,
  getToday,
  isToday,
} from "./dateUtils";

describe("getToday", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    const result = getToday();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isToday", () => {
  it("returns true for today", () => {
    expect(isToday(getToday())).toBe(true);
  });

  it("returns false for a past date", () => {
    expect(isToday("2000-01-01")).toBe(false);
  });

  it("returns false for a future date", () => {
    expect(isToday("2099-12-31")).toBe(false);
  });
});

describe("getStartOfMonth", () => {
  it("returns the first day of the given month", () => {
    expect(getStartOfMonth("2024-03-15")).toBe("2024-03-01");
  });

  it("works for the last day of a month", () => {
    expect(getStartOfMonth("2024-01-31")).toBe("2024-01-01");
  });
});

describe("getEndOfMonth", () => {
  it("returns the last day of a regular month", () => {
    expect(getEndOfMonth("2024-03-01")).toBe("2024-03-31");
  });

  it("returns 2024-02-29 for a leap year February", () => {
    expect(getEndOfMonth("2024-02-01")).toBe("2024-02-29");
  });

  it("returns 2023-02-28 for a non-leap year February", () => {
    expect(getEndOfMonth("2023-02-01")).toBe("2023-02-28");
  });
});

describe("addDays", () => {
  it("adds 1 day across a month boundary", () => {
    expect(addDays("2024-01-31", 1)).toBe("2024-02-01");
  });

  it("subtracts days with negative value", () => {
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });

  it("adds multiple days", () => {
    expect(addDays("2024-01-01", 30)).toBe("2024-01-31");
  });
});

describe("addMonths", () => {
  it("adds 1 month", () => {
    expect(addMonths("2024-01", 1)).toBe("2024-02");
  });

  it("adds months across a year boundary", () => {
    expect(addMonths("2024-12", 1)).toBe("2025-01");
  });

  it("subtracts months with negative value", () => {
    expect(addMonths("2024-03", -1)).toBe("2024-02");
  });
});

describe("daysInMonth", () => {
  it("returns 29 for February in a leap year", () => {
    expect(daysInMonth("2024-02-01")).toBe(29);
  });

  it("returns 28 for February in a non-leap year", () => {
    expect(daysInMonth("2023-02-01")).toBe(28);
  });

  it("returns 31 for January", () => {
    expect(daysInMonth("2024-01-01")).toBe(31);
  });

  it("returns 30 for April", () => {
    expect(daysInMonth("2024-04-01")).toBe(30);
  });
});
