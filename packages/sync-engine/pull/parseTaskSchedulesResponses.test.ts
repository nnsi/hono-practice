import { describe, expect, it } from "vitest";

import { type ApiResponse, parseResponses } from "./parseResponses";

const response = (value: unknown): ApiResponse => ({
  ok: true,
  json: async () => value,
});
const parse = (schedules: ApiResponse | null) =>
  parseResponses(
    response({ activities: [] }),
    response({ logs: [] }),
    response({ goals: [] }),
    null,
    response({ tasks: [] }),
    null,
    schedules,
  );
describe("taskSchedules response parsing", () => {
  it("allows null during staged rollout", async () => {
    expect(await parse(null)).toMatchObject({
      allSynced: true,
      data: { taskSchedules: [] },
    });
  });
  it("keeps explicit HTTP errors from advancing the watermark", async () => {
    expect(await parse({ ok: false, json: async () => ({}) })).toMatchObject({
      allSynced: false,
    });
  });
  it("maps schedules through the typed camel/snake mapper", async () => {
    expect(
      await parse(
        response({
          taskSchedules: [
            {
              id: "s1",
              recurrence_type: "weekdays",
              weekdays: [1],
              memo: null,
            },
          ],
        }),
      ),
    ).toMatchObject({
      allSynced: true,
      data: {
        taskSchedules: [
          {
            id: "s1",
            recurrenceType: "weekdays",
            weekdays: [1],
            intervalDays: null,
            memo: null,
          },
        ],
      },
    });
  });
  it("rejects malformed server rows instead of treating them as a successful pull", async () => {
    await expect(
      parse(
        response({
          taskSchedules: [{ recurrenceType: "interval", intervalDays: 1 }],
        }),
      ),
    ).rejects.toThrow();
  });
});
