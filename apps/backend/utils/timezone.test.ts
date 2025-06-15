import { describe, expect, it } from "vitest";

import {
  DEFAULT_TIMEZONE,
  getCurrentDateInTimezone,
  getDaysBetweenInTimezone,
  getEndOfDayInTimezone,
  getStartOfDayInTimezone,
  formatDateInTimezone,
} from "./timezone";

describe("timezone utils", () => {
  describe("getStartOfDayInTimezone", () => {
    it("should return JST 00:00:00 for a date string", () => {
      const result = getStartOfDayInTimezone("2024-01-01");
      expect(result.toISOString()).toBe("2023-12-31T15:00:00.000Z"); // JST 00:00 = UTC 15:00 (前日)
    });

    it("should throw error for non-JST timezone", () => {
      expect(() => 
        getStartOfDayInTimezone("2024-01-01", "America/New_York")
      ).toThrow("Timezone America/New_York is not supported yet");
    });
  });

  describe("getEndOfDayInTimezone", () => {
    it("should return JST 23:59:59.999 for a date string", () => {
      const result = getEndOfDayInTimezone("2024-01-01");
      expect(result.toISOString()).toBe("2024-01-01T14:59:59.999Z"); // JST 23:59:59.999 = UTC 14:59:59.999
    });
  });

  describe("getDaysBetweenInTimezone", () => {
    it("should return 1 for the same date", () => {
      const days = getDaysBetweenInTimezone("2024-01-01", "2024-01-01");
      expect(days).toBe(1);
    });

    it("should return 3 for 3-day period", () => {
      const days = getDaysBetweenInTimezone("2024-01-01", "2024-01-03");
      expect(days).toBe(3);
    });

    it("should handle month boundary correctly", () => {
      const days = getDaysBetweenInTimezone("2024-01-30", "2024-02-01");
      expect(days).toBe(3);
    });

    it("should handle year boundary correctly", () => {
      const days = getDaysBetweenInTimezone("2023-12-31", "2024-01-02");
      expect(days).toBe(3);
    });
  });

  describe("formatDateInTimezone", () => {
    it("should format UTC time to JST date correctly", () => {
      // UTC 2024-01-01 15:00 = JST 2024-01-02 00:00
      const date = new Date("2024-01-01T15:00:00Z");
      const formatted = formatDateInTimezone(date);
      expect(formatted).toBe("2024-01-02");
    });

    it("should format UTC time before JST midnight correctly", () => {
      // UTC 2024-01-01 14:59 = JST 2024-01-01 23:59
      const date = new Date("2024-01-01T14:59:00Z");
      const formatted = formatDateInTimezone(date);
      expect(formatted).toBe("2024-01-01");
    });
  });

  describe("getCurrentDateInTimezone", () => {
    it("should return a date string in YYYY-MM-DD format", () => {
      const dateStr = getCurrentDateInTimezone();
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("JST midnight boundary tests", () => {
    it("should handle activities logged at JST 23:59 and 00:01 correctly", () => {
      // JST 2024-01-01 23:59 = UTC 2024-01-01 14:59
      const beforeMidnight = new Date("2024-01-01T14:59:00Z");
      const afterMidnight = new Date("2024-01-01T15:01:00Z");
      
      const beforeDate = formatDateInTimezone(beforeMidnight);
      const afterDate = formatDateInTimezone(afterMidnight);
      
      expect(beforeDate).toBe("2024-01-01");
      expect(afterDate).toBe("2024-01-02");
      
      // Day count should increase
      const days = getDaysBetweenInTimezone(beforeDate, afterDate);
      expect(days).toBe(2); // 1月1日と1月2日の2日間
    });
  });
});