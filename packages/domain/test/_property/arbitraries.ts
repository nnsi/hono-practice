import dayjs from "dayjs";
import fc from "fast-check";

export const isoDateArb = fc
  .date({
    min: new Date("2020-01-01T00:00:00Z"),
    max: new Date("2030-12-31T23:59:59Z"),
    noInvalidDate: true,
  })
  .map((d) => dayjs(d).format("YYYY-MM-DD"));

export const dateRangeArb = fc
  .tuple(isoDateArb, fc.integer({ min: 0, max: 400 }))
  .map(([start, span]) => ({
    start,
    end: dayjs(start).add(span, "day").format("YYYY-MM-DD"),
    span,
  }));

export const monthBoundaryDateArb = fc.constantFrom(
  "2024-01-31",
  "2024-02-28",
  "2024-02-29",
  "2024-03-01",
  "2025-02-28",
  "2025-12-31",
  "2026-01-01",
  "2026-12-31",
  "2027-01-01",
  "2028-02-29",
  "2028-12-31",
  "2029-01-01",
);

export const dayTargetsArb = fc
  .record({
    1: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
    2: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
    3: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
    4: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
    5: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
    6: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
    7: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
  })
  .map((r) => {
    const out: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number>> = {};
    for (const k of [1, 2, 3, 4, 5, 6, 7] as const) {
      const v = r[k];
      if (v !== undefined) out[k] = v;
    }
    return out;
  });

export const logEntryArb = (start: string, end: string) =>
  fc.record({
    date: fc
      .integer({
        min: 0,
        max: Math.max(0, dayjs(end).diff(dayjs(start), "day")),
      })
      .map((d) => dayjs(start).add(d, "day").format("YYYY-MM-DD")),
    quantity: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  });
