import { describe, expect, it, vi } from "vitest";

import { aggregateBinaryLogs } from "./aggregateBinaryLogs";

function makeLog(overrides: Record<string, unknown> = {}) {
  return {
    id: "log-1",
    activityId: "a1",
    activityKindId: null as string | null,
    quantity: 1 as number | null,
    date: "2026-03-15",
    createdAt: "2026-03-15T10:00:00Z",
    deletedAt: null as string | null,
    ...overrides,
  };
}

describe("aggregateBinaryLogs", () => {
  it("does nothing when no pending logs", async () => {
    const updateLog = vi.fn();
    const deleteLogs = vi.fn();

    await aggregateBinaryLogs(
      async () => [],
      async () => [{ id: "a1", recordingMode: "binary" }],
      updateLog,
      deleteLogs,
    );

    expect(updateLog).not.toHaveBeenCalled();
    expect(deleteLogs).not.toHaveBeenCalled();
  });

  it("does nothing for non-binary activity logs", async () => {
    const updateLog = vi.fn();
    const deleteLogs = vi.fn();
    const logs = [
      makeLog({ id: "l1" }),
      makeLog({ id: "l2", createdAt: "2026-03-15T11:00:00Z" }),
    ];

    await aggregateBinaryLogs(
      async () => logs,
      async () => [{ id: "a1", recordingMode: "manual" }],
      updateLog,
      deleteLogs,
    );

    expect(updateLog).not.toHaveBeenCalled();
    expect(deleteLogs).not.toHaveBeenCalled();
  });

  it("does nothing for single binary log (no duplicates)", async () => {
    const updateLog = vi.fn();
    const deleteLogs = vi.fn();

    await aggregateBinaryLogs(
      async () => [makeLog({ id: "l1" })],
      async () => [{ id: "a1", recordingMode: "binary" }],
      updateLog,
      deleteLogs,
    );

    expect(updateLog).not.toHaveBeenCalled();
    expect(deleteLogs).not.toHaveBeenCalled();
  });

  it("aggregates binary logs with same date+activityId+activityKindId", async () => {
    const updateLog = vi.fn();
    const deleteLogs = vi.fn();
    const logs = [
      makeLog({
        id: "l1",
        quantity: 3,
        createdAt: "2026-03-15T10:00:00Z",
      }),
      makeLog({
        id: "l2",
        quantity: 5,
        createdAt: "2026-03-15T11:00:00Z",
      }),
      makeLog({
        id: "l3",
        quantity: 2,
        createdAt: "2026-03-15T12:00:00Z",
      }),
    ];

    await aggregateBinaryLogs(
      async () => logs,
      async () => [{ id: "a1", recordingMode: "binary" }],
      updateLog,
      deleteLogs,
    );

    expect(updateLog).toHaveBeenCalledWith("l1", {
      quantity: 10,
      updatedAt: expect.any(String),
      _syncStatus: "pending",
    });
    expect(deleteLogs).toHaveBeenCalledWith(["l2", "l3"]);
  });

  it("preserves the first log by createdAt as keeper", async () => {
    const updateLog = vi.fn();
    const deleteLogs = vi.fn();
    const logs = [
      makeLog({
        id: "l-late",
        quantity: 1,
        createdAt: "2026-03-15T12:00:00Z",
      }),
      makeLog({
        id: "l-early",
        quantity: 1,
        createdAt: "2026-03-15T08:00:00Z",
      }),
    ];

    await aggregateBinaryLogs(
      async () => logs,
      async () => [{ id: "a1", recordingMode: "binary" }],
      updateLog,
      deleteLogs,
    );

    // l-early has the earliest createdAt, so it should be the keeper
    expect(updateLog).toHaveBeenCalledWith("l-early", expect.any(Object));
    expect(deleteLogs).toHaveBeenCalledWith(["l-late"]);
  });

  it("does not aggregate deleted logs", async () => {
    const updateLog = vi.fn();
    const deleteLogs = vi.fn();
    const logs = [
      makeLog({ id: "l1", quantity: 3 }),
      makeLog({
        id: "l2",
        quantity: 5,
        deletedAt: "2026-03-15T11:00:00Z",
      }),
    ];

    await aggregateBinaryLogs(
      async () => logs,
      async () => [{ id: "a1", recordingMode: "binary" }],
      updateLog,
      deleteLogs,
    );

    // Only l1 is non-deleted, so no aggregation needed
    expect(updateLog).not.toHaveBeenCalled();
    expect(deleteLogs).not.toHaveBeenCalled();
  });

  it("groups separately by activityKindId", async () => {
    const updateLog = vi.fn();
    const deleteLogs = vi.fn();
    const logs = [
      makeLog({
        id: "l1",
        activityKindId: "k1",
        quantity: 2,
        createdAt: "2026-03-15T10:00:00Z",
      }),
      makeLog({
        id: "l2",
        activityKindId: "k1",
        quantity: 3,
        createdAt: "2026-03-15T11:00:00Z",
      }),
      makeLog({
        id: "l3",
        activityKindId: "k2",
        quantity: 4,
        createdAt: "2026-03-15T10:00:00Z",
      }),
      makeLog({
        id: "l4",
        activityKindId: "k2",
        quantity: 1,
        createdAt: "2026-03-15T11:00:00Z",
      }),
    ];

    await aggregateBinaryLogs(
      async () => logs,
      async () => [{ id: "a1", recordingMode: "binary" }],
      updateLog,
      deleteLogs,
    );

    expect(updateLog).toHaveBeenCalledTimes(2);
    expect(updateLog).toHaveBeenCalledWith("l1", {
      quantity: 5,
      updatedAt: expect.any(String),
      _syncStatus: "pending",
    });
    expect(updateLog).toHaveBeenCalledWith("l3", {
      quantity: 5,
      updatedAt: expect.any(String),
      _syncStatus: "pending",
    });
    expect(deleteLogs).toHaveBeenCalledTimes(2);
  });

  it("groups separately by date", async () => {
    const updateLog = vi.fn();
    const deleteLogs = vi.fn();
    const logs = [
      makeLog({
        id: "l1",
        date: "2026-03-14",
        quantity: 1,
        createdAt: "2026-03-14T10:00:00Z",
      }),
      makeLog({
        id: "l2",
        date: "2026-03-14",
        quantity: 2,
        createdAt: "2026-03-14T11:00:00Z",
      }),
      makeLog({
        id: "l3",
        date: "2026-03-15",
        quantity: 3,
        createdAt: "2026-03-15T10:00:00Z",
      }),
    ];

    await aggregateBinaryLogs(
      async () => logs,
      async () => [{ id: "a1", recordingMode: "binary" }],
      updateLog,
      deleteLogs,
    );

    // Only date 2026-03-14 group has multiple logs
    expect(updateLog).toHaveBeenCalledTimes(1);
    expect(updateLog).toHaveBeenCalledWith("l1", {
      quantity: 3,
      updatedAt: expect.any(String),
      _syncStatus: "pending",
    });
    expect(deleteLogs).toHaveBeenCalledWith(["l2"]);
  });

  it("treats null quantity as 0 when summing", async () => {
    const updateLog = vi.fn();
    const deleteLogs = vi.fn();
    const logs = [
      makeLog({
        id: "l1",
        quantity: null,
        createdAt: "2026-03-15T10:00:00Z",
      }),
      makeLog({
        id: "l2",
        quantity: 3,
        createdAt: "2026-03-15T11:00:00Z",
      }),
    ];

    await aggregateBinaryLogs(
      async () => logs,
      async () => [{ id: "a1", recordingMode: "binary" }],
      updateLog,
      deleteLogs,
    );

    expect(updateLog).toHaveBeenCalledWith("l1", {
      quantity: 3,
      updatedAt: expect.any(String),
      _syncStatus: "pending",
    });
  });

  it("mixes binary and non-binary activities correctly", async () => {
    const updateLog = vi.fn();
    const deleteLogs = vi.fn();
    const logs = [
      makeLog({
        id: "l1",
        activityId: "a-binary",
        quantity: 1,
        createdAt: "2026-03-15T10:00:00Z",
      }),
      makeLog({
        id: "l2",
        activityId: "a-binary",
        quantity: 2,
        createdAt: "2026-03-15T11:00:00Z",
      }),
      makeLog({
        id: "l3",
        activityId: "a-manual",
        quantity: 5,
        createdAt: "2026-03-15T10:00:00Z",
      }),
      makeLog({
        id: "l4",
        activityId: "a-manual",
        quantity: 10,
        createdAt: "2026-03-15T11:00:00Z",
      }),
    ];

    await aggregateBinaryLogs(
      async () => logs,
      async () => [
        { id: "a-binary", recordingMode: "binary" },
        { id: "a-manual", recordingMode: "manual" },
      ],
      updateLog,
      deleteLogs,
    );

    // Only binary activity logs should be aggregated
    expect(updateLog).toHaveBeenCalledTimes(1);
    expect(updateLog).toHaveBeenCalledWith("l1", {
      quantity: 3,
      updatedAt: expect.any(String),
      _syncStatus: "pending",
    });
    expect(deleteLogs).toHaveBeenCalledWith(["l2"]);
  });
});
