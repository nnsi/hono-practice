import { describe, expect, it } from "vitest";

import { VALIDATION } from "../../validation";
import {
  SyncActivitiesEnvelopeSchema,
  SyncActivitiesRequestSchema,
} from "./activity";
import { SyncActivityLogsRequestSchema } from "./activityLog";
import { SyncGoalsRequestSchema } from "./goal";
import { SyncGoalFreezePeriodsRequestSchema } from "./goalFreezePeriod";
import { SyncNotesRequestSchema } from "./note";
import { SyncTasksRequestSchema } from "./task";
import { hasUniqueIds } from "./uniqueIds";

const ID_1 = "10000000-0000-4000-8000-000000000001";
const ID_2 = "10000000-0000-4000-8000-000000000002";
const ACTIVITY_ID = "00000000-0000-4000-8000-000000000001";
const NOW = "2026-01-01T00:00:00.000Z";

const base = { createdAt: NOW, updatedAt: NOW, deletedAt: null };

const activity = (id: string) => ({
  ...base,
  id,
  name: "a",
  label: "",
  emoji: "",
  iconType: "emoji" as const,
  iconUrl: null,
  iconThumbnailUrl: null,
  description: "",
  quantityUnit: "",
  orderIndex: "a",
  showCombinedStats: true,
});
const kind = (id: string) => ({
  ...base,
  id,
  activityId: ACTIVITY_ID,
  name: "k",
  color: null,
  orderIndex: "a",
});
const log = (id: string, quantity: number | null = 1) => ({
  ...base,
  id,
  activityId: ACTIVITY_ID,
  activityKindId: null,
  quantity,
  memo: "",
  date: "2026-01-01",
  time: null,
});
const goal = (id: string) => ({
  ...base,
  id,
  activityId: ACTIVITY_ID,
  dailyTargetQuantity: 1,
  startDate: "2026-01-01",
  endDate: null,
  isActive: true,
  description: "",
  debtCap: null,
  dayTargets: null,
});
const freeze = (id: string) => ({
  ...base,
  id,
  goalId: ACTIVITY_ID,
  startDate: "2026-01-01",
  endDate: null,
});
const note = (id: string) => ({
  ...base,
  id,
  activityId: null,
  title: "t",
  content: "",
});
const task = (id: string) => ({
  ...base,
  id,
  activityId: null,
  activityKindId: null,
  quantity: null,
  title: "t",
  startDate: null,
  dueDate: null,
  doneDate: null,
  memo: "",
  archivedAt: null,
});

describe("hasUniqueIds", () => {
  it("Postgres の uuid 型と同様に大文字小文字違いの id を同一とみなす", () => {
    // 英字を含む id でないと toUpperCase が no-op になる
    const lower = "1000000a-0000-4000-8000-00000000000b";
    expect(hasUniqueIds([{ id: lower }, { id: lower.toUpperCase() }])).toBe(
      false,
    );
    expect(
      SyncActivityLogsRequestSchema.safeParse({
        logs: [log(lower), log(lower.toUpperCase())],
      }).success,
    ).toBe(false);
  });

  it("string の id を持つ要素だけを数える", () => {
    expect(hasUniqueIds([{ id: ID_1 }, { id: ID_2 }])).toBe(true);
    expect(hasUniqueIds([{ id: ID_1 }, { id: ID_1 }])).toBe(false);
    expect(hasUniqueIds([null, 1, {}, { id: 1 }, { id: ID_1 }])).toBe(true);
    expect(hasUniqueIds([])).toBe(true);
  });
});

describe("sync request schemas reject duplicate ids", () => {
  const cases: [
    string,
    { safeParse(v: unknown): { success: boolean } },
    unknown,
    unknown,
  ][] = [
    [
      "activities",
      SyncActivitiesRequestSchema,
      { activities: [activity(ID_1), activity(ID_2)], activityKinds: [] },
      { activities: [activity(ID_1), activity(ID_1)], activityKinds: [] },
    ],
    [
      "activityKinds",
      SyncActivitiesRequestSchema,
      { activities: [], activityKinds: [kind(ID_1), kind(ID_2)] },
      { activities: [], activityKinds: [kind(ID_1), kind(ID_1)] },
    ],
    [
      "activities envelope (unknown records)",
      SyncActivitiesEnvelopeSchema,
      { activities: [{ id: ID_1 }, { broken: true }], activityKinds: [] },
      { activities: [{ id: ID_1 }, { id: ID_1 }], activityKinds: [] },
    ],
    [
      "activityKinds envelope (unknown records)",
      SyncActivitiesEnvelopeSchema,
      { activities: [], activityKinds: [{ id: ID_1 }, { id: ID_2 }] },
      { activities: [], activityKinds: [{ id: ID_1 }, { id: ID_1 }] },
    ],
    [
      "activity logs",
      SyncActivityLogsRequestSchema,
      { logs: [log(ID_1), log(ID_2)] },
      { logs: [log(ID_1), log(ID_1)] },
    ],
    [
      "goals",
      SyncGoalsRequestSchema,
      { goals: [goal(ID_1), goal(ID_2)] },
      { goals: [goal(ID_1), goal(ID_1)] },
    ],
    [
      "goal freeze periods",
      SyncGoalFreezePeriodsRequestSchema,
      { freezePeriods: [freeze(ID_1), freeze(ID_2)] },
      { freezePeriods: [freeze(ID_1), freeze(ID_1)] },
    ],
    [
      "notes",
      SyncNotesRequestSchema,
      { notes: [note(ID_1), note(ID_2)] },
      { notes: [note(ID_1), note(ID_1)] },
    ],
    [
      "tasks",
      SyncTasksRequestSchema,
      { tasks: [task(ID_1), task(ID_2)] },
      { tasks: [task(ID_1), task(ID_1)] },
    ],
  ];

  it.each(cases)("%s", (_name, schema, unique, duplicated) => {
    expect(schema.safeParse(unique).success).toBe(true);
    expect(schema.safeParse(duplicated).success).toBe(false);
  });
});

describe("activity log sync quantity upper bound", () => {
  it("deletedAt ありの tombstone は上限導入前の legacy quantity でも受理する", () => {
    expect(
      SyncActivityLogsRequestSchema.safeParse({
        logs: [
          {
            ...log(ID_1, VALIDATION.QUANTITY_MAX + 1),
            deletedAt: NOW,
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("v1 と同じ QUANTITY_MAX を超えると拒否する", () => {
    expect(
      SyncActivityLogsRequestSchema.safeParse({
        logs: [log(ID_1, VALIDATION.QUANTITY_MAX)],
      }).success,
    ).toBe(true);
    expect(
      SyncActivityLogsRequestSchema.safeParse({
        logs: [log(ID_1, VALIDATION.QUANTITY_MAX + 1)],
      }).success,
    ).toBe(false);
    expect(
      SyncActivityLogsRequestSchema.safeParse({ logs: [log(ID_1, null)] })
        .success,
    ).toBe(true);
  });
});
