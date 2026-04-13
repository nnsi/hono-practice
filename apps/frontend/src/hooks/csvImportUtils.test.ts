import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DexieActivity, DexieActivityKind } from "../db/schema";
import {
  buildValidatedLogs,
  getValidationSummaryError,
  revalidateEditedLog,
  validateRequiredMapping,
} from "./csvImportUtils";

vi.mock("@packages/i18n", () => ({
  i18next: {
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  },
}));

function createActivity(overrides: Partial<DexieActivity> = {}): DexieActivity {
  return {
    id: "activity-1",
    userId: "user-1",
    name: "Run",
    label: "Run",
    emoji: "🏃",
    iconType: "emoji",
    iconUrl: null,
    iconThumbnailUrl: null,
    description: "",
    quantityUnit: "km",
    orderIndex: "a0",
    showCombinedStats: true,
    recordingMode: "manual",
    recordingModeConfig: null,
    createdAt: "2026-04-13T00:00:00.000Z",
    updatedAt: "2026-04-13T00:00:00.000Z",
    deletedAt: null,
    _syncStatus: "synced",
    ...overrides,
  };
}

function createActivityKind(
  overrides: Partial<DexieActivityKind> = {},
): DexieActivityKind {
  return {
    id: "kind-1",
    activityId: "activity-1",
    name: "Jog",
    color: null,
    orderIndex: "a0",
    createdAt: "2026-04-13T00:00:00.000Z",
    updatedAt: "2026-04-13T00:00:00.000Z",
    deletedAt: null,
    _syncStatus: "synced",
    ...overrides,
  };
}

describe("csvImportUtils", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T00:00:00.000Z"));
  });

  it("validateRequiredMapping reports missing required columns", () => {
    const result = validateRequiredMapping({}, (key) => key);
    expect(result).toBe(
      "validation.dateRequired\nvalidation.activityOrFixed\nvalidation.quantityRequired",
    );
  });

  it("revalidateEditedLog clears kind and marks activity as new when activity changes", () => {
    const activities = [createActivity()];
    const kinds = [createActivityKind()];
    const logs = buildValidatedLogs(
      [
        {
          date: "2026-04-12",
          activity: "Run",
          kind: "Jog",
          quantity: "3",
        },
      ],
      {
        date: "date",
        activity: "activity",
        kind: "kind",
        quantity: "quantity",
      },
      activities,
      kinds,
    );

    const result = revalidateEditedLog(
      logs[0],
      "activityName",
      "Swim",
      {
        date: "date",
        activity: "activity",
        kind: "kind",
        quantity: "quantity",
      },
      activities,
      kinds,
    );

    expect(result.activityName).toBe("Swim");
    expect(result.kindName).toBeUndefined();
    expect(result.isNewActivity).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("getValidationSummaryError reports the number of invalid rows", () => {
    const logs = [
      {
        date: "2026-04-12",
        activityName: "Run",
        activityId: "activity-1",
        kindName: undefined,
        quantity: 3,
        memo: "",
        isNewActivity: false,
        errors: [],
      },
      {
        date: "",
        activityName: "Run",
        activityId: "activity-1",
        kindName: undefined,
        quantity: 3,
        memo: "",
        isNewActivity: false,
        errors: [{ field: "date", message: "required" }],
      },
    ];

    expect(getValidationSummaryError(logs, (key) => `:${key}`)).toBe(
      "1:validation.errorsFound",
    );
  });
});
