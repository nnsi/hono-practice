import { noopTracer } from "@backend/lib/tracer";
import { createUserId } from "@packages/domain/user/userSchema";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import type { GoalFreezePeriodRepository } from "../goalFreezePeriodRepository";
import { newGoalFreezePeriodUsecase } from "../goalFreezePeriodUsecase";

describe("GoalFreezePeriodUsecase", () => {
  let repo: GoalFreezePeriodRepository;
  let usecase: ReturnType<typeof newGoalFreezePeriodUsecase>;

  const userId = createUserId("00000000-0000-4000-8000-000000000000");
  const goalId = "00000000-0000-4000-8000-000000000001";
  const freezePeriodId = "00000000-0000-4000-8000-000000000002";

  beforeEach(() => {
    repo = mock<GoalFreezePeriodRepository>();
    usecase = newGoalFreezePeriodUsecase(instance(repo), noopTracer);
    reset(repo);
  });

  it("createFreezePeriod rejects endDate before startDate", async () => {
    when(repo.isGoalOwnedByUser(goalId, userId)).thenResolve(true);

    await expect(
      usecase.createFreezePeriod(userId, goalId, {
        startDate: "2026-01-10",
        endDate: "2026-01-09",
      }),
    ).rejects.toThrow("endDate must be on or after startDate");

    verify(
      repo.createGoalFreezePeriod(
        anything(),
        anything(),
        anything(),
        anything(),
      ),
    ).never();
  });

  it("updateFreezePeriod rejects a range made invalid by existing values", async () => {
    when(repo.getFreezePeriodByIdAndUserId(freezePeriodId, userId)).thenResolve(
      {
        id: freezePeriodId,
        goalId,
        userId,
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    );

    await expect(
      usecase.updateFreezePeriod(userId, goalId, freezePeriodId, {
        startDate: "2026-02-01",
      }),
    ).rejects.toThrow("endDate must be on or after startDate");

    verify(
      repo.updateGoalFreezePeriod(anything(), anything(), anything()),
    ).never();
  });

  it("updateFreezePeriod preserves omitted endDate and clears explicit null endDate", async () => {
    when(repo.getFreezePeriodByIdAndUserId(freezePeriodId, userId)).thenResolve(
      {
        id: freezePeriodId,
        goalId,
        userId,
        startDate: "2026-01-01",
        endDate: "2026-01-31",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    );
    when(repo.updateGoalFreezePeriod(freezePeriodId, userId, anything()))
      .thenResolve({
        id: freezePeriodId,
        goalId,
        userId,
        startDate: "2026-01-10",
        endDate: "2026-01-31",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      })
      .thenResolve({
        id: freezePeriodId,
        goalId,
        userId,
        startDate: "2026-01-01",
        endDate: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      });

    const preserved = await usecase.updateFreezePeriod(
      userId,
      goalId,
      freezePeriodId,
      { startDate: "2026-01-10" },
    );
    const cleared = await usecase.updateFreezePeriod(
      userId,
      goalId,
      freezePeriodId,
      { endDate: null },
    );

    expect(preserved.endDate).toBe("2026-01-31");
    expect(cleared.endDate).toBeNull();
    verify(
      repo.updateGoalFreezePeriod(freezePeriodId, userId, anything()),
    ).twice();
  });
});
