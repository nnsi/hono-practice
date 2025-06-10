import {
  type UserId,
  type ActivityId,
  type ActivityDebtId,
  type ActivityGoalId,
  createUserId,
  createActivityId,
  createActivityDebtId,
  createActivityGoalId,
  createActivityDebtEntity,
  createActivityGoalEntity,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import { newGoalUsecase } from "../goalUsecase";

import type { ActivityDebtRepository } from "../../activitydebt/activityDebtRepository";
import type { ActivityDebtService } from "../../activitydebt/activityDebtService";
import type { ActivityGoalRepository } from "../../activitygoal/activityGoalRepository";
import type { ActivityGoalService } from "../../activitygoal/activityGoalService";
import type {
  GoalFilters,
  CreateDebtGoalRequest,
  CreateMonthlyGoalRequest,
  Goal,
  DebtGoal,
  MonthlyTargetGoal,
} from "../goalUsecase";

describe("GoalUsecase", () => {
  let activityDebtRepo: ActivityDebtRepository;
  let activityGoalRepo: ActivityGoalRepository;
  let activityDebtService: ActivityDebtService;
  let activityGoalService: ActivityGoalService;
  let usecase: ReturnType<typeof newGoalUsecase>;

  beforeEach(() => {
    activityDebtRepo = mock<ActivityDebtRepository>();
    activityGoalRepo = mock<ActivityGoalRepository>();
    activityDebtService = mock<ActivityDebtService>();
    activityGoalService = mock<ActivityGoalService>();

    usecase = newGoalUsecase(
      instance(activityDebtRepo),
      instance(activityGoalRepo),
      instance(activityDebtService),
      instance(activityGoalService),
    );

    reset(activityDebtRepo);
    reset(activityGoalRepo);
    reset(activityDebtService);
    reset(activityGoalService);
  });

  const userId1 = createUserId("00000000-0000-4000-8000-000000000000");
  const activityId1 = createActivityId("00000000-0000-4000-8000-000000000001");
  const debtId1 = createActivityDebtId("00000000-0000-4000-8000-000000000002");
  const goalId1 = createActivityGoalId("00000000-0000-4000-8000-000000000003");

  const mockDebtEntity = createActivityDebtEntity({
    type: "persisted",
    id: debtId1,
    userId: userId1,
    activityId: activityId1,
    dailyTargetQuantity: 10,
    startDate: "2024-01-01",
    endDate: null,
    isActive: true,
    description: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  });

  const mockGoalEntity = createActivityGoalEntity({
    type: "persisted",
    id: goalId1,
    userId: userId1,
    activityId: activityId1,
    targetMonth: "2024-01",
    targetQuantity: 300,
    description: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  });

  describe("getGoals", () => {
    type GetGoalsTestCase = {
      name: string;
      userId: UserId;
      filters?: GoalFilters;
      mockDebts: any[];
      mockGoals: any[];
      mockDebtBalances: {
        currentBalance: number;
        totalDebt: number;
        totalActual: number;
      }[];
      mockGoalProgresses: {
        currentQuantity: number;
        progressRate: number;
        isAchieved: boolean;
      }[];
      expectedGoalsCount: number;
      expectError: boolean;
    };

    const testCases: GetGoalsTestCase[] = [
      {
        name: "success / no goals",
        userId: userId1,
        mockDebts: [],
        mockGoals: [],
        mockDebtBalances: [],
        mockGoalProgresses: [],
        expectedGoalsCount: 0,
        expectError: false,
      },
      {
        name: "success / with debt and monthly goals",
        userId: userId1,
        mockDebts: [mockDebtEntity],
        mockGoals: [mockGoalEntity],
        mockDebtBalances: [
          { currentBalance: -5, totalDebt: 100, totalActual: 95 },
        ],
        mockGoalProgresses: [
          { currentQuantity: 150, progressRate: 0.5, isAchieved: false },
        ],
        expectedGoalsCount: 2,
        expectError: false,
      },
      {
        name: "success / with debt type filter",
        userId: userId1,
        filters: { type: "debt" },
        mockDebts: [mockDebtEntity],
        mockGoals: [mockGoalEntity],
        mockDebtBalances: [
          { currentBalance: -5, totalDebt: 100, totalActual: 95 },
        ],
        mockGoalProgresses: [
          { currentQuantity: 150, progressRate: 0.5, isAchieved: false },
        ],
        expectedGoalsCount: 1,
        expectError: false,
      },
      {
        name: "success / with activity filter",
        userId: userId1,
        filters: { activityId: activityId1 },
        mockDebts: [mockDebtEntity],
        mockGoals: [mockGoalEntity],
        mockDebtBalances: [
          { currentBalance: -5, totalDebt: 100, totalActual: 95 },
        ],
        mockGoalProgresses: [
          { currentQuantity: 150, progressRate: 0.5, isAchieved: false },
        ],
        expectedGoalsCount: 2,
        expectError: false,
      },
    ];

    testCases.forEach(
      ({
        name,
        userId,
        filters,
        mockDebts,
        mockGoals,
        mockDebtBalances,
        mockGoalProgresses,
        expectedGoalsCount,
        expectError,
      }) => {
        it(`${name}`, async () => {
          when(activityDebtRepo.getByUserId(userId)).thenResolve(mockDebts);
          when(activityGoalRepo.getByUserId(userId)).thenResolve(mockGoals);

          mockDebts.forEach((debt, index) => {
            when(
              activityDebtService.calculateCurrentBalance(userId, debt),
            ).thenResolve(mockDebtBalances[index]);
          });

          mockGoals.forEach((goal, index) => {
            when(
              activityGoalService.calculateProgress(userId, goal),
            ).thenResolve(mockGoalProgresses[index]);
          });

          if (expectError) {
            when(activityDebtRepo.getByUserId(userId)).thenReject(new Error());
            await expect(usecase.getGoals(userId, filters)).rejects.toThrow(
              Error,
            );
            return;
          }

          const result = await usecase.getGoals(userId, filters);
          expect(result).toHaveLength(expectedGoalsCount);

          verify(activityDebtRepo.getByUserId(userId)).once();
          verify(activityGoalRepo.getByUserId(userId)).once();
        });
      },
    );
  });

  describe("getGoal", () => {
    type GetGoalTestCase = {
      name: string;
      userId: UserId;
      goalId: string;
      type: "debt" | "monthly_target";
      mockReturn: any | undefined;
      mockBalance?: {
        currentBalance: number;
        totalDebt: number;
        totalActual: number;
      };
      mockProgress?: {
        currentQuantity: number;
        progressRate: number;
        isAchieved: boolean;
      };
      expectError?: {
        notFound?: ResourceNotFoundError;
        getError?: Error;
      };
    };

    const testCases: GetGoalTestCase[] = [
      {
        name: "success / debt goal",
        userId: userId1,
        goalId: debtId1,
        type: "debt",
        mockReturn: mockDebtEntity,
        mockBalance: { currentBalance: -5, totalDebt: 100, totalActual: 95 },
      },
      {
        name: "success / monthly goal",
        userId: userId1,
        goalId: goalId1,
        type: "monthly_target",
        mockReturn: mockGoalEntity,
        mockProgress: {
          currentQuantity: 150,
          progressRate: 0.5,
          isAchieved: false,
        },
      },
      {
        name: "failed / debt goal not found",
        userId: userId1,
        goalId: debtId1,
        type: "debt",
        mockReturn: undefined,
        expectError: {
          notFound: new ResourceNotFoundError("Debt goal not found"),
        },
      },
      {
        name: "failed / monthly goal not found",
        userId: userId1,
        goalId: goalId1,
        type: "monthly_target",
        mockReturn: undefined,
        expectError: {
          notFound: new ResourceNotFoundError("Monthly goal not found"),
        },
      },
    ];

    testCases.forEach(
      ({
        name,
        userId,
        goalId,
        type,
        mockReturn,
        mockBalance,
        mockProgress,
        expectError,
      }) => {
        it(`${name}`, async () => {
          if (type === "debt") {
            when(
              activityDebtRepo.getByIdAndUserId(
                goalId as ActivityDebtId,
                userId,
              ),
            ).thenResolve(mockReturn);

            if (mockReturn && mockBalance) {
              when(
                activityDebtService.calculateCurrentBalance(userId, mockReturn),
              ).thenResolve(mockBalance);
            }
          } else {
            when(
              activityGoalRepo.getByIdAndUserId(
                goalId as ActivityGoalId,
                userId,
              ),
            ).thenResolve(mockReturn);

            if (mockReturn && mockProgress) {
              when(
                activityGoalService.calculateProgress(userId, mockReturn),
              ).thenResolve(mockProgress);
            }
          }

          if (expectError?.notFound) {
            await expect(usecase.getGoal(userId, goalId, type)).rejects.toThrow(
              ResourceNotFoundError,
            );
            return;
          }

          const result = await usecase.getGoal(userId, goalId, type);
          expect(result).toBeDefined();
          expect(result.type).toEqual(type);

          if (type === "debt") {
            verify(
              activityDebtRepo.getByIdAndUserId(
                goalId as ActivityDebtId,
                userId,
              ),
            ).once();
          } else {
            verify(
              activityGoalRepo.getByIdAndUserId(
                goalId as ActivityGoalId,
                userId,
              ),
            ).once();
          }
        });
      },
    );
  });

  describe("createDebtGoal", () => {
    type CreateDebtGoalTestCase = {
      name: string;
      userId: UserId;
      params: CreateDebtGoalRequest;
      mockReturn: any;
      expectError: boolean;
    };

    const testCases: CreateDebtGoalTestCase[] = [
      {
        name: "success",
        userId: userId1,
        params: {
          activityId: activityId1,
          dailyTargetQuantity: 10,
          startDate: "2024-01-01",
          description: "Test debt goal",
        },
        mockReturn: mockDebtEntity,
        expectError: false,
      },
      {
        name: "success / without description",
        userId: userId1,
        params: {
          activityId: activityId1,
          dailyTargetQuantity: 15,
          startDate: "2024-01-01",
        },
        mockReturn: {
          ...mockDebtEntity,
          dailyTargetQuantity: 15,
          description: null,
        },
        expectError: false,
      },
    ];

    testCases.forEach(({ name, userId, params, mockReturn, expectError }) => {
      it(`${name}`, async () => {
        when(activityDebtRepo.create(anything())).thenResolve(mockReturn);

        if (expectError) {
          when(activityDebtRepo.create(anything())).thenReject(new Error());
          await expect(usecase.createDebtGoal(userId, params)).rejects.toThrow(
            Error,
          );
          return;
        }

        const result = await usecase.createDebtGoal(userId, params);
        expect(result.type).toEqual("debt");
        expect(result.activityId).toEqual(params.activityId);
        expect(result.dailyTargetQuantity).toEqual(params.dailyTargetQuantity);

        verify(activityDebtRepo.create(anything())).once();
      });
    });
  });

  describe("createMonthlyGoal", () => {
    type CreateMonthlyGoalTestCase = {
      name: string;
      userId: UserId;
      params: CreateMonthlyGoalRequest;
      mockReturn: any;
      expectError: boolean;
    };

    const testCases: CreateMonthlyGoalTestCase[] = [
      {
        name: "success",
        userId: userId1,
        params: {
          activityId: activityId1,
          targetMonth: "2024-01",
          targetQuantity: 300,
          description: "Test monthly goal",
        },
        mockReturn: mockGoalEntity,
        expectError: false,
      },
      {
        name: "success / without description",
        userId: userId1,
        params: {
          activityId: activityId1,
          targetMonth: "2024-02",
          targetQuantity: 400,
        },
        mockReturn: {
          ...mockGoalEntity,
          targetMonth: "2024-02",
          targetQuantity: 400,
          description: null,
        },
        expectError: false,
      },
    ];

    testCases.forEach(({ name, userId, params, mockReturn, expectError }) => {
      it(`${name}`, async () => {
        when(activityGoalRepo.create(anything())).thenResolve(mockReturn);

        if (expectError) {
          when(activityGoalRepo.create(anything())).thenReject(new Error());
          await expect(
            usecase.createMonthlyGoal(userId, params),
          ).rejects.toThrow(Error);
          return;
        }

        const result = await usecase.createMonthlyGoal(userId, params);
        expect(result.type).toEqual("monthly_target");
        expect(result.activityId).toEqual(params.activityId);
        expect(result.targetQuantity).toEqual(params.targetQuantity);

        verify(activityGoalRepo.create(anything())).once();
      });
    });
  });

  describe("updateGoal", () => {
    it("should throw not implemented error", async () => {
      await expect(
        usecase.updateGoal(userId1, debtId1, "debt", {
          dailyTargetQuantity: 15,
        }),
      ).rejects.toThrow("Not implemented yet");
    });
  });

  describe("deleteGoal", () => {
    it("should throw not implemented error", async () => {
      await expect(
        usecase.deleteGoal(userId1, debtId1, "debt"),
      ).rejects.toThrow("Not implemented yet");
    });
  });
});
