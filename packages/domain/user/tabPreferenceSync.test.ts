import { describe, expect, it } from "vitest";

import {
  type LocalTabPreference,
  createDefaultLocalTabPreference,
  markTabPreferencePending,
} from "./tabPreferenceSchema";
import {
  createPendingTabPreference,
  resolveFlushedTabPreference,
  shouldRetryTabPreferenceFlush,
} from "./tabPreferenceSync";

describe("tabPreferenceSync", () => {
  it("creates a strictly newer pending preference than the current one", () => {
    const current = {
      ...markTabPreferencePending(["home", "stats", "goals", "tasks"]),
      updatedAt: "2026-04-12T05:00:00.010Z",
    };

    expect(
      createPendingTabPreference(
        current,
        ["home", "stats", "goals", "notes"],
        new Date("2026-04-12T05:00:00.010Z"),
      ),
    ).toEqual({
      tabs: ["home", "stats", "goals", "notes"],
      updatedAt: "2026-04-12T05:00:00.011Z",
      syncStatus: "pending",
    });
  });

  it("applies the server result when the flushed request is still current", () => {
    const pending = {
      ...markTabPreferencePending(["home", "stats", "goals", "notes"]),
      updatedAt: "2026-04-12T05:00:00.010Z",
    };

    expect(
      resolveFlushedTabPreference(pending, pending, {
        tabs: ["home", "stats", "goals", "notes"],
        updatedAt: "2026-04-12T05:00:00.010Z",
      }),
    ).toEqual({
      tabs: ["home", "stats", "goals", "notes"],
      updatedAt: "2026-04-12T05:00:00.010Z",
      syncStatus: "synced",
    });
  });

  it("keeps a newer pending preference when an older flush response arrives", () => {
    const request = {
      ...markTabPreferencePending(["home", "stats", "goals", "tasks"]),
      updatedAt: "2026-04-12T05:00:00.010Z",
    };
    const current = {
      ...markTabPreferencePending(["home", "stats", "goals", "notes"]),
      updatedAt: "2026-04-12T05:00:00.011Z",
    };

    expect(
      resolveFlushedTabPreference(current, request, {
        tabs: ["home", "stats", "goals", "tasks"],
        updatedAt: "2026-04-12T05:00:00.010Z",
      }),
    ).toEqual(current);
  });

  it("keeps the current state when another flush already synced a newer value", () => {
    const request = {
      ...markTabPreferencePending(["home", "stats", "goals", "tasks"]),
      updatedAt: "2026-04-12T05:00:00.010Z",
    };
    const current: LocalTabPreference = {
      ...createDefaultLocalTabPreference(),
      tabs: ["home", "stats", "goals", "notes"],
      updatedAt: "2026-04-12T05:00:00.011Z",
    };

    expect(
      resolveFlushedTabPreference(current, request, {
        tabs: ["home", "stats", "goals", "tasks"],
        updatedAt: "2026-04-12T05:00:00.010Z",
      }),
    ).toEqual(current);
  });

  it("keeps a newer pending preference when tabs changed with the same timestamp", () => {
    const request = {
      ...markTabPreferencePending(["home", "stats", "goals", "tasks"]),
      updatedAt: "2026-04-12T05:00:00.010Z",
    };
    const current = {
      ...markTabPreferencePending(["home", "stats", "goals", "notes"]),
      updatedAt: "2026-04-12T05:00:00.010Z",
    };

    expect(
      resolveFlushedTabPreference(current, request, {
        tabs: ["home", "stats", "goals", "tasks"],
        updatedAt: "2026-04-12T05:00:00.010Z",
      }),
    ).toEqual(current);
  });

  it("retries only retryable server errors", () => {
    expect(shouldRetryTabPreferenceFlush(500)).toBe(true);
    expect(shouldRetryTabPreferenceFlush(503)).toBe(true);
    expect(shouldRetryTabPreferenceFlush(400)).toBe(false);
  });
});
