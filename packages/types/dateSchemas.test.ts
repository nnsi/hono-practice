import { describe, expect, it } from "vitest";

import {
  CreateActivityLogRequestSchema,
  CreateFreezePeriodRequestSchema,
  CreateGoalRequestSchema,
  UpdateFreezePeriodRequestSchema,
  UpdateGoalRequestSchema,
  createTaskRequestSchema,
  getActivityLogStatsRequestSchema,
  updateTaskRequestSchema,
} from "./request";
import {
  UpsertGoalFreezePeriodRequestSchema,
  UpsertGoalRequestSchema,
  UpsertTaskRequestSchema,
} from "./sync";

describe("request date schemas", () => {
  it("activity log create requires activityId and a YYYY-MM-DD date", () => {
    expect(
      CreateActivityLogRequestSchema.safeParse({
        date: "2026-01-01",
        quantity: 1,
        activityKindId: null,
      }).success,
    ).toBe(false);

    expect(
      CreateActivityLogRequestSchema.safeParse({
        date: "2026-01",
        quantity: 1,
        activityId: "00000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(false);
    expect(
      CreateActivityLogRequestSchema.safeParse({
        date: "2026-13-01",
        quantity: 1,
        activityId: "00000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(false);

    expect(
      CreateActivityLogRequestSchema.safeParse({
        date: "2026-01-01",
        quantity: 1,
        activityId: "00000000-0000-4000-8000-000000000001",
        activityKindId: null,
      }).success,
    ).toBe(true);
  });

  it("date query accepts YYYY-MM and YYYY-MM-DD only", () => {
    expect(
      getActivityLogStatsRequestSchema.safeParse({ date: "2026-01" }).success,
    ).toBe(true);
    expect(
      getActivityLogStatsRequestSchema.safeParse({ date: "2026-01-31" })
        .success,
    ).toBe(true);
    expect(
      getActivityLogStatsRequestSchema.safeParse({ date: "2026" }).success,
    ).toBe(false);
  });

  it("goal and freeze-period create reject endDate before startDate", () => {
    expect(
      CreateGoalRequestSchema.safeParse({
        activityId: "00000000-0000-4000-8000-000000000001",
        dailyTargetQuantity: 10,
        startDate: "2026-01-10",
        endDate: "2026-01-09",
      }).success,
    ).toBe(false);

    expect(
      CreateFreezePeriodRequestSchema.safeParse({
        startDate: "2026-01-10",
        endDate: "2026-01-09",
      }).success,
    ).toBe(false);
  });

  it("update schemas reject an inverted range when both dates are supplied", () => {
    expect(
      UpdateGoalRequestSchema.safeParse({
        startDate: "2026-01-10",
        endDate: "2026-01-09",
      }).success,
    ).toBe(false);

    expect(
      UpdateFreezePeriodRequestSchema.safeParse({
        startDate: "2026-01-10",
        endDate: "2026-01-09",
      }).success,
    ).toBe(false);

    expect(
      updateTaskRequestSchema.safeParse({
        startDate: "2026-01-10",
        dueDate: "2026-01-09",
      }).success,
    ).toBe(false);
  });

  it("task create rejects dueDate before startDate", () => {
    expect(
      createTaskRequestSchema.safeParse({
        title: "Task",
        startDate: "2026-01-10",
        dueDate: "2026-01-09",
      }).success,
    ).toBe(false);
  });
});

describe("sync request date schemas", () => {
  const baseGoal = {
    id: "00000000-0000-4000-8000-000000000001",
    activityId: "00000000-0000-4000-8000-000000000002",
    dailyTargetQuantity: 10,
    startDate: "2026-01-10",
    endDate: "2026-01-09",
    isActive: true,
    description: "",
    debtCap: null,
    dayTargets: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
  };

  it("sync goals reject endDate before startDate", () => {
    expect(UpsertGoalRequestSchema.safeParse(baseGoal).success).toBe(false);
  });

  it("sync freeze periods reject endDate before startDate", () => {
    expect(
      UpsertGoalFreezePeriodRequestSchema.safeParse({
        id: "00000000-0000-4000-8000-000000000001",
        goalId: "00000000-0000-4000-8000-000000000002",
        startDate: "2026-01-10",
        endDate: "2026-01-09",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        deletedAt: null,
      }).success,
    ).toBe(false);
  });

  it("sync tasks reject dueDate before startDate", () => {
    expect(
      UpsertTaskRequestSchema.safeParse({
        id: "00000000-0000-4000-8000-000000000001",
        activityId: null,
        activityKindId: null,
        quantity: null,
        title: "Task",
        startDate: "2026-01-10",
        dueDate: "2026-01-09",
        doneDate: null,
        memo: "",
        archivedAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        deletedAt: null,
      }).success,
    ).toBe(false);
  });
});
