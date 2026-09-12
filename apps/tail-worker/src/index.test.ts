import { describe, expect, it, vi } from "vitest";

import worker, { parseLogMessage, shouldWrite } from "./index";

describe("Tail Worker", () => {
  const diagnostic = {
    version: 1,
    env: "production",
    platform: "ios",
    tokenSource: "bearer",
    flowId: "10000000-0000-4000-8000-000000000001",
    reason: "grace_expired",
    stage: "rotation",
    rotationCommitted: false,
  };
  const trace = (entries: unknown[]): TraceItem => ({
    event: null,
    eventTimestamp: null,
    logs: entries.map((entry) => ({
      timestamp: 0,
      level: "log",
      message: [JSON.stringify(entry)],
    })),
    exceptions: [],
    diagnosticsChannelEvents: [],
    scriptName: "backend",
    outcome: "ok",
    executionModel: "stateless",
    truncated: false,
    cpuTime: 0,
    wallTime: 0,
  });

  it("writes allowlisted auth metadata on response summaries in blob9, including 401 warnings", async () => {
    const writeDataPoint = vi.fn();
    await worker.tail(
      [
        trace([
          {
            level: "warn",
            msg: "Response sent",
            method: "POST",
            path: "/auth/token",
            status: 401,
            requestId: "20000000-0000-4000-8000-000000000001",
            authDiagnostic: { ...diagnostic, token: "secret-canary" },
          },
        ]),
      ],
      { LOGS: { writeDataPoint } },
    );
    const point = writeDataPoint.mock.calls[0][0];
    expect(point.blobs[7]).toBe("");
    expect(JSON.parse(point.blobs[8])).toEqual(diagnostic);
    expect(JSON.stringify(point)).not.toContain("secret-canary");
    expect(point.doubles[0]).toBe(401);
  });

  it("drops invalid diagnostic values while retaining the base response summary", async () => {
    const writeDataPoint = vi.fn();
    await worker.tail(
      [
        trace([
          {
            msg: "Response sent",
            status: 401,
            authDiagnostic: { ...diagnostic, reason: "secret-canary" },
          },
        ]),
      ],
      { LOGS: { writeDataPoint } },
    );
    expect(writeDataPoint).toHaveBeenCalledOnce();
    expect(writeDataPoint.mock.calls[0][0].blobs).toHaveLength(7);
    expect(JSON.stringify(writeDataPoint.mock.calls)).not.toContain(
      "secret-canary",
    );
  });

  it("continues with the next diagnostic when a data point is rejected", async () => {
    const writeDataPoint = vi.fn().mockImplementationOnce(() => {
      throw new Error("sink failed");
    });
    const entry = {
      msg: "Response sent",
      status: 401,
      authDiagnostic: diagnostic,
    };
    await expect(
      worker.tail([trace([entry, entry])], { LOGS: { writeDataPoint } }),
    ).resolves.toBeUndefined();
    expect(writeDataPoint).toHaveBeenCalledTimes(2);
  });

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

  it("writes uncaught exceptions alongside structured logs", async () => {
    const writeDataPoint = vi.fn();
    const events: TraceItem[] = [
      {
        event: null,
        eventTimestamp: null,
        logs: [
          {
            timestamp: 0,
            level: "log",
            message: [JSON.stringify({ level: "error", msg: "logged" })],
          },
        ],
        exceptions: [
          { timestamp: 1, name: "TypeError", message: "uncaught boom" },
        ],
        diagnosticsChannelEvents: [],
        scriptName: "backend",
        outcome: "exception",
        executionModel: "stateless",
        truncated: false,
        cpuTime: 1,
        wallTime: 2,
      },
    ];

    await worker.tail(events, { LOGS: { writeDataPoint } });

    expect(writeDataPoint).toHaveBeenCalledTimes(2);
    expect(writeDataPoint).toHaveBeenLastCalledWith({
      blobs: ["error", "TypeError", "", "", "", "", "uncaught boom"],
      doubles: [0, 0, 0, 0, 0, 0, 0],
      indexes: ["error"],
    });
  });
});
