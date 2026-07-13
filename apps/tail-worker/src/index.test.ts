import { describe, expect, it, vi } from "vitest";

import worker, { parseLogMessage, shouldWrite } from "./index";

describe("Tail Worker", () => {
  it("parses structured JSON objects and rejects invalid payloads", async () => {
    await expect(
      parseLogMessage('{"level":"error","status":500}'),
    ).resolves.toEqual({
      level: "error",
      status: 500,
    });
    await expect(parseLogMessage("not-json")).resolves.toBeNull();
    await expect(parseLogMessage('[{"level":"error"}]')).resolves.toBeNull();
  });

  it("rejects every known field when its runtime type is invalid", async () => {
    const invalidEntries = [
      { level: 1 },
      { msg: 1 },
      { requestId: 1 },
      { method: 1 },
      { path: 1 },
      { feature: 1 },
      { error: 1 },
      { status: "500" },
      { duration: "12" },
      { dbMs: "4" },
      { r2Ms: "3" },
      { kvMs: "1" },
      { extMs: "2" },
      { spanCount: "7" },
    ];

    for (const entry of invalidEntries) {
      await expect(parseLogMessage(JSON.stringify(entry))).resolves.toBeNull();
    }
  });

  it("writes errors and non-404 response summaries only", () => {
    expect(shouldWrite({ level: "error" })).toBe(true);
    expect(shouldWrite({ msg: "Response sent", status: 200 })).toBe(true);
    expect(shouldWrite({ msg: "Response sent", status: 404 })).toBe(false);
    expect(shouldWrite({ level: "info", msg: "request started" })).toBe(false);
  });

  it("maps structured fields to the documented WAE positions", async () => {
    const writeDataPoint = vi.fn();
    const events: TraceItem[] = [
      {
        event: null,
        eventTimestamp: null,
        logs: [
          {
            timestamp: 0,
            level: "log",
            message: [
              JSON.stringify({
                dbMs: 4,
                duration: 12,
                error: "boom",
                extMs: 2,
                feature: "auth",
                kvMs: 1,
                level: "error",
                method: "POST",
                msg: "failed",
                path: "/auth/login",
                r2Ms: 3,
                requestId: "req-1",
                spanCount: 7,
                status: 500,
              }),
            ],
          },
          {
            timestamp: 0,
            level: "log",
            message: [JSON.stringify({ msg: "Response sent", status: 404 })],
          },
          { timestamp: 0, level: "log", message: ["invalid-json"] },
        ],
        exceptions: [],
        diagnosticsChannelEvents: [],
        scriptName: "backend",
        outcome: "ok",
        executionModel: "stateless",
        truncated: false,
        cpuTime: 0,
        wallTime: 0,
      },
    ];
    const logs: AnalyticsEngineDataset = { writeDataPoint };

    await worker.tail(events, {
      LOGS: logs,
    });

    expect(writeDataPoint).toHaveBeenCalledTimes(1);
    expect(writeDataPoint).toHaveBeenCalledWith({
      blobs: [
        "error",
        "failed",
        "req-1",
        "POST",
        "/auth/login",
        "auth",
        "boom",
      ],
      doubles: [500, 12, 4, 3, 1, 2, 7],
      indexes: ["error"],
    });
  });
});
