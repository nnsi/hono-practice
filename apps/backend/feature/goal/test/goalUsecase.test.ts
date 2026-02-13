import {
  type ActivityGoalId,
  type GoalBalance,
  createActivityGoalEntity,
  createActivityId,
  createUserId,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";
import { noopTracer } from "@backend/lib/tracer";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import type { ActivityGoalRepository } from "../../activitygoal/activityGoalRepository";
import type { ActivityGoalService } from "../../activitygoal/activityGoalService";
import type {
  CreateGoalRequest,
  GoalFilters,
  UpdateGoalRequest,
} from "../goalUsecase";
import { newGoalUsecase } from "../goalUsecase";

describe("GoalUsecase", () => {
  let activityGoalRepo: ActivityGoalRepository;
  let activityGoalService: ActivityGoalService;
  let usecase: ReturnType<typeof newGoalUsecase>;

  beforeEach(() => {
    activityGoalRepo = mock<ActivityGoalRepository>();
    activityGoalService = mock<ActivityGoalService>();

    reset(activityGoalRepo);
    reset(activityGoalService);

    usecase = newGoalUsecase(
      instance(activityGoalRepo),
      instance(activityGoalService),
      noopTracer,
    );
  });

  describe("getGoals", () => {
    it("should return goals with balance information", async () => {
      const userId = createUserId();
      const activityId = createActivityId();
      const goal = createActivityGoalEntity({
        type: "persisted",
        id: "00000000-0000-4000-8000-000000000001" as ActivityGoalId,
        userId,
        activityId,
        dailyTargetQuantity: 10,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: "Test goal",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const balance: GoalBalance = {
        currentBalance: -50,
        totalTarget: 100,
        totalActual: 50,
        dailyTarget: 10,
        daysActive: 10,
        lastCalculatedDate: "2024-01-10",
      };

      when(activityGoalRepo.getActivityGoalsByUserId(userId)).thenResolve([
        goal,
      ]);
      when(
        activityGoalService.calculateCurrentBalance(userId, goal),
      ).thenResolve(balance);

      const result = await usecase.getGoals(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: goal.id,
        userId: goal.userId,
        activityId: goal.activityId,
        isActive: goal.isActive,
        dailyTargetQuantity: goal.dailyTargetQuantity,
        startDate: goal.startDate,
        currentBalance: balance.currentBalance,
        totalTarget: balance.totalTarget,
        totalActual: balance.totalActual,
      });
    });

    it("should filter goals by activityId", async () => {
      const userId = createUserId();
      const activityId1 = createActivityId();
      const activityId2 = createActivityId();

      const goal1 = createActivityGoalEntity({
        type: "persisted",
        id: "00000000-0000-4000-8000-000000000001" as ActivityGoalId,
        userId,
        activityId: activityId1,
        dailyTargetQuantity: 10,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const goal2 = createActivityGoalEntity({
        type: "persisted",
        id: "00000000-0000-4000-8000-000000000002" as ActivityGoalId,
        userId,
        activityId: activityId2,
        dailyTargetQuantity: 20,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const balance: GoalBalance = {
        currentBalance: 0,
        totalTarget: 0,
        totalActual: 0,
        dailyTarget: 10,
        daysActive: 0,
        lastCalculatedDate: "2024-01-01",
      };

      when(activityGoalRepo.getActivityGoalsByUserId(userId)).thenResolve([
        goal1,
        goal2,
      ]);
      when(
        activityGoalService.calculateCurrentBalance(userId, anything()),
      ).thenResolve(balance);

      const filters: GoalFilters = { activityId: activityId1 };
      const result = await usecase.getGoals(userId, filters);

      expect(result).toHaveLength(1);
      expect(result[0].activityId).toBe(activityId1);
    });
  });

  describe("createGoal", () => {
    it("should create a new goal", async () => {
      const userId = createUserId();
      const activityId = createActivityId();
      const request: CreateGoalRequest = {
        activityId,
        dailyTargetQuantity: 10,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        description: "New goal",
      };

      when(activityGoalRepo.createActivityGoal(anything())).thenResolve(
        createActivityGoalEntity({
          type: "persisted",
          id: "00000000-0000-4000-8000-000000000001" as ActivityGoalId,
          userId,
          activityId,
          dailyTargetQuantity: request.dailyTargetQuantity,
          startDate: request.startDate,
          endDate: request.endDate ?? null,
          isActive: true,
          description: request.description ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await usecase.createGoal(userId, request);

      expect(result.activityId).toBe(activityId);
      expect(result.dailyTargetQuantity).toBe(10);
      expect(result.startDate).toBe("2024-01-01");
      expect(result.endDate).toBe("2024-12-31");
      verify(activityGoalRepo.createActivityGoal(anything())).once();
    });
  });

  describe("updateGoal", () => {
    it("should update an existing goal", async () => {
      const userId = createUserId();
      const goalId = "00000000-0000-4000-8000-000000000001";
      const activityId = createActivityId();

      const existingGoal = createActivityGoalEntity({
        type: "persisted",
        id: goalId as ActivityGoalId,
        userId,
        activityId,
        dailyTargetQuantity: 10,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: "Old description",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      });

      const updateRequest: UpdateGoalRequest = {
        dailyTargetQuantity: 20,
        description: "Updated description",
      };

      when(
        activityGoalRepo.getActivityGoalByIdAndUserId(anything(), userId),
      ).thenResolve(existingGoal);

      when(activityGoalRepo.updateActivityGoal(anything())).thenResolve(
        createActivityGoalEntity({
          type: "persisted",
          id: existingGoal.id,
          userId: existingGoal.userId,
          activityId: existingGoal.activityId,
          dailyTargetQuantity: 20,
          description: "Updated description",
          startDate: existingGoal.startDate,
          endDate: existingGoal.endDate,
          isActive: existingGoal.isActive,
          createdAt:
            existingGoal.type === "persisted"
              ? existingGoal.createdAt
              : new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await usecase.updateGoal(userId, goalId, updateRequest);

      expect(result.dailyTargetQuantity).toBe(20);
      expect(result.description).toBe("Updated description");
      verify(activityGoalRepo.updateActivityGoal(anything())).once();
    });

    it("should throw error if goal not found", async () => {
      const userId = createUserId();
      const goalId = "00000000-0000-4000-8000-000000000001";

      when(
        activityGoalRepo.getActivityGoalByIdAndUserId(anything(), userId),
      ).thenResolve(undefined);

      await expect(usecase.updateGoal(userId, goalId, {})).rejects.toThrow(
        ResourceNotFoundError,
      );
    });
  });

  describe("deleteGoal", () => {
    it("should delete a goal", async () => {
      const userId = createUserId();
      const goalId = "00000000-0000-4000-8000-000000000001";
      const activityId = createActivityId();

      const goal = createActivityGoalEntity({
        type: "persisted",
        id: goalId as ActivityGoalId,
        userId,
        activityId,
        dailyTargetQuantity: 10,
        startDate: "2024-01-01",
        endDate: null,
        isActive: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      when(
        activityGoalRepo.getActivityGoalByIdAndUserId(anything(), userId),
      ).thenResolve(goal);

      when(activityGoalRepo.deleteActivityGoal(goal)).thenResolve();

      await usecase.deleteGoal(userId, goalId);

      verify(activityGoalRepo.deleteActivityGoal(goal)).once();
    });

    it("should throw error if goal not found", async () => {
      const userId = createUserId();
      const goalId = "00000000-0000-4000-8000-000000000001";

      when(
        activityGoalRepo.getActivityGoalByIdAndUserId(anything(), userId),
      ).thenResolve(undefined);

      await expect(usecase.deleteGoal(userId, goalId)).rejects.toThrow(
        ResourceNotFoundError,
      );
    });
  });
});
