import {
  type UserId,
  type ActivityId,
  type ActivityGoalId,
  createUserId,
  createActivityId,
  createActivityGoalId,
  createActivityGoalEntity,
} from "@backend/domain";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import { newActivityGoalService } from "../activityGoalService";

import type { ActivityLogRepository } from "../../activityLog";

describe("ActivityGoalService", () => {
  let activityLogRepo: ActivityLogRepository;
  let service: ReturnType<typeof newActivityGoalService>;

  beforeEach(() => {
    activityLogRepo = mock<ActivityLogRepository>();
    service = newActivityGoalService(instance(activityLogRepo));
    reset(activityLogRepo);
  });

  const userId1 = createUserId("00000000-0000-4000-8000-000000000000");
  const activityId1 = createActivityId("00000000-0000-4000-8000-000000000001");
  const goalId1 = createActivityGoalId("00000000-0000-4000-8000-000000000002");

  const mockGoalEntity = createActivityGoalEntity({
    type: "persisted",
    id: goalId1,
    userId: userId1,
    activityId: activityId1,
    targetQuantity: 100,
    targetMonth: "2024-01",
    description: null,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  });

  // 2024年1月のアクティビティログモック (1月は31日まで)
  const mockActivityLogs = [
    {
      id: "log1",
      userId: userId1,
      activity: { id: activityId1, name: "Test Activity" },
      quantity: 10,
      logDate: "2024-01-05",
    },
    {
      id: "log2",
      userId: userId1,
      activity: { id: activityId1, name: "Test Activity" },
      quantity: 15,
      logDate: "2024-01-10",
    },
    {
      id: "log3",
      userId: userId1,
      activity: { id: activityId1, name: "Test Activity" },
      quantity: 20,
      logDate: "2024-01-15",
    },
  ];

  describe("calculateProgress", () => {
    type CalculateProgressTestCase = {
      name: string;
      userId: UserId;
      goal: any;
      mockActivityLogs: any[];
      expectedProgress: {
        currentQuantity: number;
        targetQuantity: number;
        progressRate: number;
        remainingQuantity: number;
        isAchieved: boolean;
      };
      expectError: boolean;
    };

    const testCases: CalculateProgressTestCase[] = [
      {
        name: "success / partial progress (45%)",
        userId: userId1,
        goal: mockGoalEntity,
        mockActivityLogs: mockActivityLogs, // 10 + 15 + 20 = 45
        expectedProgress: {
          currentQuantity: 45,
          targetQuantity: 100,
          progressRate: 0.45, // 45/100 = 0.45
          remainingQuantity: 55, // 100 - 45 = 55
          isAchieved: false,
        },
        expectError: false,
      },
      {
        name: "success / goal achieved (100%)",
        userId: userId1,
        goal: mockGoalEntity,
        mockActivityLogs: [
          ...mockActivityLogs,
          {
            id: "log4",
            userId: userId1,
            activity: { id: activityId1, name: "Test Activity" },
            quantity: 55, // 合計100になる
            logDate: "2024-01-20",
          },
        ],
        expectedProgress: {
          currentQuantity: 100,
          targetQuantity: 100,
          progressRate: 1.0, // 100/100 = 1.0
          remainingQuantity: 0, // 100 - 100 = 0
          isAchieved: true,
        },
        expectError: false,
      },
      {
        name: "success / over achieved (120%)",
        userId: userId1,
        goal: mockGoalEntity,
        mockActivityLogs: [
          ...mockActivityLogs,
          {
            id: "log4",
            userId: userId1,
            activity: { id: activityId1, name: "Test Activity" },
            quantity: 75, // 合計120になる
            logDate: "2024-01-25",
          },
        ],
        expectedProgress: {
          currentQuantity: 120,
          targetQuantity: 100,
          progressRate: 1.0, // Math.min(120/100, 1) = 1.0
          remainingQuantity: 0, // Math.max(100 - 120, 0) = 0
          isAchieved: true,
        },
        expectError: false,
      },
      {
        name: "success / no activity (0%)",
        userId: userId1,
        goal: mockGoalEntity,
        mockActivityLogs: [],
        expectedProgress: {
          currentQuantity: 0,
          targetQuantity: 100,
          progressRate: 0, // 0/100 = 0
          remainingQuantity: 100, // 100 - 0 = 100
          isAchieved: false,
        },
        expectError: false,
      },
      {
        name: "success / different activity not counted",
        userId: userId1,
        goal: mockGoalEntity,
        mockActivityLogs: [
          {
            id: "log1",
            userId: userId1,
            activity: {
              id: "different-activity-id",
              name: "Different Activity",
            },
            quantity: 50, // この量は計算に含まれない
            logDate: "2024-01-05",
          },
          mockActivityLogs[0], // 正しいactivityIdのログ: 10
        ],
        expectedProgress: {
          currentQuantity: 10, // 正しいactivityIdのログのみ
          targetQuantity: 100,
          progressRate: 0.1, // 10/100 = 0.1
          remainingQuantity: 90, // 100 - 10 = 90
          isAchieved: false,
        },
        expectError: false,
      },
      {
        name: "success / high target goal",
        userId: userId1,
        goal: {
          ...mockGoalEntity,
          targetQuantity: 500, // より高い目標
        },
        mockActivityLogs: mockActivityLogs, // 45量
        expectedProgress: {
          currentQuantity: 45,
          targetQuantity: 500,
          progressRate: 0.09, // 45/500 = 0.09
          remainingQuantity: 455, // 500 - 45 = 455
          isAchieved: false,
        },
        expectError: false,
      },
    ];

    testCases.forEach(
      ({
        name,
        userId,
        goal,
        mockActivityLogs,
        expectedProgress,
        expectError,
      }) => {
        it(`${name}`, async () => {
          when(
            activityLogRepo.getActivityLogsByUserIdAndDate(
              userId,
              anything(),
              anything(),
            ),
          ).thenResolve(mockActivityLogs);

          if (expectError) {
            when(
              activityLogRepo.getActivityLogsByUserIdAndDate(
                userId,
                anything(),
                anything(),
              ),
            ).thenReject(new Error());

            await expect(
              service.calculateProgress(userId, goal),
            ).rejects.toThrow(Error);
            return;
          }

          const result = await service.calculateProgress(userId, goal);

          expect(result.currentQuantity).toEqual(
            expectedProgress.currentQuantity,
          );
          expect(result.targetQuantity).toEqual(
            expectedProgress.targetQuantity,
          );
          expect(result.progressRate).toBeCloseTo(
            expectedProgress.progressRate,
            2,
          );
          expect(result.remainingQuantity).toEqual(
            expectedProgress.remainingQuantity,
          );
          expect(result.isAchieved).toEqual(expectedProgress.isAchieved);

          // 追加のプロパティも検証
          expect(result).toHaveProperty("remainingDays");
          expect(result).toHaveProperty("dailyPaceRequired");

          verify(
            activityLogRepo.getActivityLogsByUserIdAndDate(
              userId,
              anything(),
              anything(),
            ),
          ).once();
        });
      },
    );
  });

  describe("getMonthlyGoals", () => {
    type GetMonthlyGoalsTestCase = {
      name: string;
      userId: UserId;
      year: number;
      month?: number;
      expectedLength: number;
    };

    const testCases: GetMonthlyGoalsTestCase[] = [
      {
        name: "success / get yearly goals",
        userId: userId1,
        year: 2024,
        expectedLength: 0, // 現在は空配列を返す実装
      },
      {
        name: "success / get monthly goals",
        userId: userId1,
        year: 2024,
        month: 1,
        expectedLength: 0, // 現在は空配列を返す実装
      },
    ];

    testCases.forEach(({ name, userId, year, month, expectedLength }) => {
      it(`${name}`, async () => {
        const result = await service.getMonthlyGoals(userId, year, month);

        expect(result).toHaveLength(expectedLength);
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe("updateTarget", () => {
    type UpdateTargetTestCase = {
      name: string;
      goal: any;
      newTarget: number;
      expectedTarget: number;
      expectError?: {
        notPersisted?: Error;
      };
    };

    const testCases: UpdateTargetTestCase[] = [
      {
        name: "success / increase target",
        goal: mockGoalEntity,
        newTarget: 150,
        expectedTarget: 150,
      },
      {
        name: "success / decrease target",
        goal: mockGoalEntity,
        newTarget: 80,
        expectedTarget: 80,
      },
      {
        name: "failed / non-persisted goal",
        goal: {
          ...mockGoalEntity,
          type: "new",
        },
        newTarget: 150,
        expectedTarget: 150,
        expectError: {
          notPersisted: new Error(
            "Cannot update target for non-persisted goal",
          ),
        },
      },
    ];

    testCases.forEach(
      ({ name, goal, newTarget, expectedTarget, expectError }) => {
        it(`${name}`, async () => {
          if (expectError?.notPersisted) {
            await expect(service.updateTarget(goal, newTarget)).rejects.toThrow(
              "Cannot update target for non-persisted goal",
            );
            return;
          }

          const result = await service.updateTarget(goal, newTarget);

          expect(result.targetQuantity).toEqual(expectedTarget);
          expect(result.id).toEqual(goal.id);
          expect(result.userId).toEqual(goal.userId);
          expect(result.targetMonth).toEqual(goal.targetMonth);
        });
      },
    );
  });
});
