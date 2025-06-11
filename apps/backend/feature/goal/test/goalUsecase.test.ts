import {
  type UserId,
  type ActivityId,
  type ActivityDebtId,
  type ActivityGoalId,
  type DebtBalance,
  type GoalProgress,
  createUserId,
  createActivityId,
  createActivityDebtId,
  createActivityGoalId,
  createActivityDebtEntity,
  createActivityGoalEntity,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";
import { anything, deepEqual, instance, mock, reset, verify, when } from "ts-mockito";
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
  UpdateDebtGoalRequest,
  UpdateMonthlyGoalRequest,
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

    reset(activityDebtRepo);
    reset(activityGoalRepo);
    reset(activityDebtService);
    reset(activityGoalService);

    usecase = newGoalUsecase(
      instance(activityDebtRepo),
      instance(activityGoalRepo),
      instance(activityDebtService),
      instance(activityGoalService),
    );
  });

  // Test data constants
  const userId1 = createUserId("00000000-0000-4000-8000-000000000000");
  const activityId1 = createActivityId("00000000-0000-4000-8000-000000000001");
  const debtId1 = createActivityDebtId("00000000-0000-4000-8000-000000000002");
  const goalId1 = createActivityGoalId("00000000-0000-4000-8000-000000000003");

  // Helper functions for creating mock data
  const createMockDebtBalance = (overrides: Partial<DebtBalance> = {}): DebtBalance => ({
    currentBalance: 0,
    totalDebt: 0,
    totalActual: 0,
    dailyTarget: 10,
    daysActive: 0,
    lastCalculatedDate: "2024-01-01",
    ...overrides,
  });

  const createMockGoalProgress = (overrides: Partial<GoalProgress> = {}): GoalProgress => ({
    currentQuantity: 0,
    progressRate: 0,
    isAchieved: false,
    targetQuantity: 300,
    remainingQuantity: 300,
    remainingDays: 30,
    dailyPaceRequired: 10,
    ...overrides,
  });

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
      mockDebtBalances: DebtBalance[];
      mockGoalProgresses: GoalProgress[];
      expectedGoalsCount: number;
      expectError?: {
        repositoryError?: Error;
        serviceError?: Error;
      };
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
      },
      {
        name: "success / with debt and monthly goals",
        userId: userId1,
        mockDebts: [mockDebtEntity],
        mockGoals: [mockGoalEntity],
        mockDebtBalances: [
          createMockDebtBalance({ 
            currentBalance: -5, 
            totalDebt: 100, 
            totalActual: 95,
            daysActive: 10,
          }),
        ],
        mockGoalProgresses: [
          createMockGoalProgress({ 
            currentQuantity: 150, 
            progressRate: 0.5, 
            remainingQuantity: 150,
            remainingDays: 15,
          }),
        ],
        expectedGoalsCount: 2,
      },
      {
        name: "success / with debt type filter",
        userId: userId1,
        filters: { type: "debt" },
        mockDebts: [mockDebtEntity],
        mockGoals: [mockGoalEntity],
        mockDebtBalances: [
          createMockDebtBalance({ 
            currentBalance: -5, 
            totalDebt: 100, 
            totalActual: 95,
            daysActive: 10,
          }),
        ],
        mockGoalProgresses: [
          createMockGoalProgress({ 
            currentQuantity: 150, 
            progressRate: 0.5, 
            remainingQuantity: 150,
            remainingDays: 15,
          }),
        ],
        expectedGoalsCount: 1,
      },
      {
        name: "success / with activity filter",
        userId: userId1,
        filters: { activityId: activityId1 },
        mockDebts: [mockDebtEntity],
        mockGoals: [mockGoalEntity],
        mockDebtBalances: [
          createMockDebtBalance({ 
            currentBalance: -5, 
            totalDebt: 100, 
            totalActual: 95,
            daysActive: 10,
          }),
        ],
        mockGoalProgresses: [
          createMockGoalProgress({ 
            currentQuantity: 150, 
            progressRate: 0.5, 
            remainingQuantity: 150,
            remainingDays: 15,
          }),
        ],
        expectedGoalsCount: 2,
      },
      {
        name: "failed / repository error",
        userId: userId1,
        mockDebts: [],
        mockGoals: [],
        mockDebtBalances: [],
        mockGoalProgresses: [],
        expectedGoalsCount: 0,
        expectError: {
          repositoryError: new Error("Repository error"),
        },
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
          if (expectError?.repositoryError) {
            when(activityDebtRepo.getByUserId(userId)).thenReject(expectError.repositoryError);
            await expect(usecase.getGoals(userId, filters)).rejects.toThrow(
              expectError.repositoryError.constructor,
            );
            return;
          }
          
          if (expectError?.serviceError) {
            when(activityDebtRepo.getByUserId(userId)).thenResolve(mockDebts);
            when(activityGoalRepo.getByUserId(userId)).thenResolve(mockGoals);
            when(activityDebtService.calculateCurrentBalance(anything(), anything())).thenReject(expectError.serviceError);
            await expect(usecase.getGoals(userId, filters)).rejects.toThrow(
              expectError.serviceError.constructor,
            );
            return;
          }

          // リポジトリのモックを設定
          when(activityDebtRepo.getByUserId(userId)).thenResolve(mockDebts);
          when(activityGoalRepo.getByUserId(userId)).thenResolve(mockGoals);

          // サービスのモックを設定
          const balanceToReturn = mockDebtBalances.length > 0 ? mockDebtBalances[0] : createMockDebtBalance();
          const progressToReturn = mockGoalProgresses.length > 0 ? mockGoalProgresses[0] : createMockGoalProgress();
          
          when(
            activityDebtService.calculateCurrentBalance(anything(), anything()),
          ).thenReturn(Promise.resolve(balanceToReturn));

          when(
            activityGoalService.calculateProgress(anything(), anything()),
          ).thenReturn(Promise.resolve(progressToReturn));

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
      mockBalance?: DebtBalance;
      mockProgress?: GoalProgress;
      expectError?: {
        notFound?: ResourceNotFoundError;
        repositoryError?: Error;
        serviceError?: Error;
      };
    };

    const testCases: GetGoalTestCase[] = [
      {
        name: "success / debt goal",
        userId: userId1,
        goalId: debtId1,
        type: "debt",
        mockReturn: mockDebtEntity,
        mockBalance: createMockDebtBalance({ 
          currentBalance: -5, 
          totalDebt: 100, 
          totalActual: 95,
          daysActive: 10,
        }),
      },
      {
        name: "success / monthly goal",
        userId: userId1,
        goalId: goalId1,
        type: "monthly_target",
        mockReturn: mockGoalEntity,
        mockProgress: createMockGoalProgress({
          currentQuantity: 150,
          progressRate: 0.5,
          remainingQuantity: 150,
          remainingDays: 15,
        }),
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

            // Always set up the calculateCurrentBalance mock when mockReturn is defined
            if (mockReturn) {
              const balanceToUse = mockBalance || createMockDebtBalance();
              when(
                activityDebtService.calculateCurrentBalance(anything(), anything()),
              ).thenReturn(Promise.resolve(balanceToUse));
            }
          } else {
            when(
              activityGoalRepo.getByIdAndUserId(
                goalId as ActivityGoalId,
                userId,
              ),
            ).thenResolve(mockReturn);

            if (mockReturn) {
              const progressToUse = mockProgress || createMockGoalProgress();
              when(
                activityGoalService.calculateProgress(anything(), anything()),
              ).thenReturn(Promise.resolve(progressToUse));
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
    type UpdateGoalTestCase = {
      name: string;
      userId: UserId;
      goalId: string;
      type: "debt" | "monthly_target";
      params: UpdateDebtGoalRequest | UpdateMonthlyGoalRequest;
      mockExisting: any;
      mockUpdated: any;
      expectError?: {
        notFound?: ResourceNotFoundError;
        updateError?: Error;
      };
    };

    const testCases: UpdateGoalTestCase[] = [
      {
        name: "success / update debt goal",
        userId: userId1,
        goalId: debtId1,
        type: "debt",
        params: {
          dailyTargetQuantity: 15,
          description: "Updated debt goal",
        } as UpdateDebtGoalRequest,
        mockExisting: mockDebtEntity,
        mockUpdated: {
          ...mockDebtEntity,
          dailyTargetQuantity: 15,
          description: "Updated debt goal",
        },
      },
      {
        name: "success / update monthly goal",
        userId: userId1,
        goalId: goalId1,
        type: "monthly_target",
        params: {
          targetQuantity: 400,
          description: "Updated monthly goal",
        } as UpdateMonthlyGoalRequest,
        mockExisting: mockGoalEntity,
        mockUpdated: {
          ...mockGoalEntity,
          targetQuantity: 400,
          description: "Updated monthly goal",
        },
      },
      {
        name: "failed / debt goal not found",
        userId: userId1,
        goalId: debtId1,
        type: "debt",
        params: { dailyTargetQuantity: 15 } as UpdateDebtGoalRequest,
        mockExisting: undefined,
        mockUpdated: null,
        expectError: {
          notFound: new ResourceNotFoundError("Debt goal not found"),
        },
      },
      {
        name: "failed / monthly goal not found",
        userId: userId1,
        goalId: goalId1,
        type: "monthly_target",
        params: { targetQuantity: 400 } as UpdateMonthlyGoalRequest,
        mockExisting: undefined,
        mockUpdated: null,
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
        params,
        mockExisting,
        mockUpdated,
        expectError,
      }) => {
        it(`${name}`, async () => {
          if (type === "debt") {
            when(
              activityDebtRepo.getByIdAndUserId(goalId as ActivityDebtId, userId),
            ).thenResolve(mockExisting);
            
            if (mockExisting && mockUpdated) {
              when(activityDebtRepo.update(anything())).thenResolve(mockUpdated);
            }
          } else {
            when(
              activityGoalRepo.getByIdAndUserId(goalId as ActivityGoalId, userId),
            ).thenResolve(mockExisting);
            
            if (mockExisting && mockUpdated) {
              when(activityGoalRepo.update(anything())).thenResolve(mockUpdated);
            }
          }

          if (expectError?.notFound) {
            await expect(
              usecase.updateGoal(userId, goalId, type, params),
            ).rejects.toThrow(ResourceNotFoundError);
            return;
          }

          const result = await usecase.updateGoal(userId, goalId, type, params);
          expect(result).toBeDefined();
          expect(result.type).toEqual(type);

          if (type === "debt") {
            verify(
              activityDebtRepo.getByIdAndUserId(goalId as ActivityDebtId, userId),
            ).once();
            verify(activityDebtRepo.update(anything())).once();
          } else {
            verify(
              activityGoalRepo.getByIdAndUserId(goalId as ActivityGoalId, userId),
            ).once();
            verify(activityGoalRepo.update(anything())).once();
          }
        });
      },
    );
  });

  describe("deleteGoal", () => {
    type DeleteGoalTestCase = {
      name: string;
      userId: UserId;
      goalId: string;
      type: "debt" | "monthly_target";
      mockExisting: any;
      expectError?: {
        notFound?: ResourceNotFoundError;
        deleteError?: Error;
      };
    };

    const testCases: DeleteGoalTestCase[] = [
      {
        name: "success / delete debt goal",
        userId: userId1,
        goalId: debtId1,
        type: "debt",
        mockExisting: mockDebtEntity,
      },
      {
        name: "success / delete monthly goal",
        userId: userId1,
        goalId: goalId1,
        type: "monthly_target",
        mockExisting: mockGoalEntity,
      },
      {
        name: "failed / debt goal not found",
        userId: userId1,
        goalId: debtId1,
        type: "debt",
        mockExisting: undefined,
        expectError: {
          notFound: new ResourceNotFoundError("Debt goal not found"),
        },
      },
      {
        name: "failed / monthly goal not found",
        userId: userId1,
        goalId: goalId1,
        type: "monthly_target",
        mockExisting: undefined,
        expectError: {
          notFound: new ResourceNotFoundError("Monthly goal not found"),
        },
      },
    ];

    testCases.forEach(
      ({ name, userId, goalId, type, mockExisting, expectError }) => {
        it(`${name}`, async () => {
          if (type === "debt") {
            when(
              activityDebtRepo.getByIdAndUserId(goalId as ActivityDebtId, userId),
            ).thenResolve(mockExisting);
            
            if (mockExisting) {
              when(activityDebtRepo.delete(mockExisting)).thenResolve();
            }
          } else {
            when(
              activityGoalRepo.getByIdAndUserId(goalId as ActivityGoalId, userId),
            ).thenResolve(mockExisting);
            
            if (mockExisting) {
              when(activityGoalRepo.delete(mockExisting)).thenResolve();
            }
          }

          if (expectError?.notFound) {
            await expect(
              usecase.deleteGoal(userId, goalId, type),
            ).rejects.toThrow(ResourceNotFoundError);
            return;
          }

          await usecase.deleteGoal(userId, goalId, type);

          if (type === "debt") {
            verify(
              activityDebtRepo.getByIdAndUserId(goalId as ActivityDebtId, userId),
            ).once();
            verify(activityDebtRepo.delete(mockExisting)).once();
          } else {
            verify(
              activityGoalRepo.getByIdAndUserId(goalId as ActivityGoalId, userId),
            ).once();
            verify(activityGoalRepo.delete(mockExisting)).once();
          }
        });
      },
    );
  });
});
