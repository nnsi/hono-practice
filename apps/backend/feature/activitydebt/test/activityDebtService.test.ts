import {
  type UserId,
  createActivityDebtEntity,
  createActivityId,
  createActivityLogId,
  createUserId,
} from "@backend/domain";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import { newActivityDebtService } from "../activityDebtService";

import type { ActivityLogRepository } from "../../activityLog";

describe("ActivityDebtService", () => {
  let activityLogRepo: ActivityLogRepository;
  let service: ReturnType<typeof newActivityDebtService>;

  beforeEach(() => {
    activityLogRepo = mock<ActivityLogRepository>();
    service = newActivityDebtService(instance(activityLogRepo));
    reset(activityLogRepo);
  });

  const userId1 = createUserId("00000000-0000-4000-8000-000000000000");
  const activityId1 = createActivityId("00000000-0000-4000-8000-000000000001");
  const debtId1 = "00000000-0000-4000-8000-000000000002" as any;

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

  const mockActivityLogs = [
    {
      type: "persisted" as const,
      id: createActivityLogId("00000000-0000-4000-8000-000000000003"),
      userId: userId1,
      activity: {
        type: "persisted" as const,
        id: activityId1,
        name: "Test Activity",
        userId: userId1,
        color: "#000000",
        emoji: "🏃",
        order: 0,
        isDeleted: false,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      },
      activityKind: null,
      quantity: 5,
      memo: null,
      date: "2024-01-01",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
    },
    {
      type: "persisted" as const,
      id: createActivityLogId("00000000-0000-4000-8000-000000000004"),
      userId: userId1,
      activity: {
        type: "persisted" as const,
        id: activityId1,
        name: "Test Activity",
        userId: userId1,
        color: "#000000",
        emoji: "🏃",
        order: 0,
        isDeleted: false,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      },
      activityKind: null,
      quantity: 8,
      memo: null,
      date: "2024-01-02",
      createdAt: new Date("2024-01-02T00:00:00Z"),
      updatedAt: new Date("2024-01-02T00:00:00Z"),
    },
    {
      type: "persisted" as const,
      id: createActivityLogId("00000000-0000-4000-8000-000000000005"),
      userId: userId1,
      activity: {
        type: "persisted" as const,
        id: activityId1,
        name: "Test Activity",
        userId: userId1,
        color: "#000000",
        emoji: "🏃",
        order: 0,
        isDeleted: false,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      },
      activityKind: null,
      quantity: 12,
      memo: null,
      date: "2024-01-03",
      createdAt: new Date("2024-01-03T00:00:00Z"),
      updatedAt: new Date("2024-01-03T00:00:00Z"),
    },
  ];

  describe("calculateCurrentBalance", () => {
    type CalculateBalanceTestCase = {
      name: string;
      userId: UserId;
      debt: any;
      calculateDate?: string;
      mockActivityLogs: any[];
      expectedBalance: {
        currentBalance: number;
        totalDebt: number;
        totalActual: number;
        dailyTarget: number;
        daysActive: number;
      };
      expectError: boolean;
    };

    const testCases: CalculateBalanceTestCase[] = [
      {
        name: "success / first day exactly on target",
        userId: userId1,
        debt: mockDebtEntity,
        calculateDate: "2024-01-01",
        mockActivityLogs: [mockActivityLogs[0]], // 5量
        expectedBalance: {
          currentBalance: -5, // 5 - 10 = -5 (負債)
          totalDebt: 10, // 1日 × 10 = 10
          totalActual: 5,
          dailyTarget: 10,
          daysActive: 1,
        },
        expectError: false,
      },
      {
        name: "success / third day with positive balance",
        userId: userId1,
        debt: mockDebtEntity,
        calculateDate: "2024-01-03",
        mockActivityLogs: mockActivityLogs, // 5 + 8 + 12 = 25
        expectedBalance: {
          currentBalance: -5, // 25 - 30 = -5 (負債)
          totalDebt: 30, // 3日 × 10 = 30
          totalActual: 25,
          dailyTarget: 10,
          daysActive: 3,
        },
        expectError: false,
      },
      {
        name: "success / current date (no specific date)",
        userId: userId1,
        debt: mockDebtEntity,
        calculateDate: "2024-01-03", // 固定日時を使用
        mockActivityLogs: mockActivityLogs,
        expectedBalance: {
          currentBalance: -5, // 25 - 30 = -5
          totalDebt: 30, // 3日 × 10 = 30
          totalActual: 25,
          dailyTarget: 10,
          daysActive: 3,
        },
        expectError: false,
      },
      {
        name: "success / high daily target with low activity",
        userId: userId1,
        debt: {
          ...mockDebtEntity,
          dailyTargetQuantity: 20, // より高い目標
        },
        calculateDate: "2024-01-03",
        mockActivityLogs: mockActivityLogs, // 25量
        expectedBalance: {
          currentBalance: -35, // 25 - 60 = -35 (大きな負債)
          totalDebt: 60, // 3日 × 20 = 60
          totalActual: 25,
          dailyTarget: 20,
          daysActive: 3,
        },
        expectError: false,
      },
      {
        name: "success / no activity logs",
        userId: userId1,
        debt: mockDebtEntity,
        calculateDate: "2024-01-02",
        mockActivityLogs: [],
        expectedBalance: {
          currentBalance: -20, // 0 - 20 = -20
          totalDebt: 20, // 2日 × 10 = 20
          totalActual: 0,
          dailyTarget: 10,
          daysActive: 2,
        },
        expectError: false,
      },
      {
        name: "success / before start date (should be zero days)",
        userId: userId1,
        debt: mockDebtEntity,
        calculateDate: "2023-12-31", // 開始日より前
        mockActivityLogs: [],
        expectedBalance: {
          currentBalance: 0, // 0 - 0 = 0
          totalDebt: 0, // 0日 × 10 = 0
          totalActual: 0,
          dailyTarget: 10,
          daysActive: 0,
        },
        expectError: false,
      },
      {
        name: "success / debt with end date, calculating before end",
        userId: userId1,
        debt: {
          ...mockDebtEntity,
          endDate: "2024-01-05", // 終了日を設定
        },
        calculateDate: "2024-01-03",
        mockActivityLogs: mockActivityLogs, // 25量
        expectedBalance: {
          currentBalance: -5, // 25 - 30 = -5
          totalDebt: 30, // 3日 × 10 = 30
          totalActual: 25,
          dailyTarget: 10,
          daysActive: 3,
        },
        expectError: false,
      },
      {
        name: "success / debt with end date, calculating after end",
        userId: userId1,
        debt: {
          ...mockDebtEntity,
          endDate: "2024-01-02", // 終了日を2日目に設定
        },
        calculateDate: "2024-01-10", // 終了日よりずっと後
        mockActivityLogs: mockActivityLogs.slice(0, 2), // 1日目と2日目のみ (5 + 8 = 13)
        expectedBalance: {
          currentBalance: -7, // 13 - 20 = -7
          totalDebt: 20, // 2日 × 10 = 20 (終了日で計算停止)
          totalActual: 13,
          dailyTarget: 10,
          daysActive: 2,
        },
        expectError: false,
      },
    ];

    testCases.forEach(
      ({
        name,
        userId,
        debt,
        calculateDate,
        mockActivityLogs,
        expectedBalance,
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
              service.calculateCurrentBalance(userId, debt, calculateDate),
            ).rejects.toThrow(Error);
            return;
          }

          const result = await service.calculateCurrentBalance(
            userId,
            debt,
            calculateDate,
          );

          expect(result.currentBalance).toEqual(expectedBalance.currentBalance);
          expect(result.totalDebt).toEqual(expectedBalance.totalDebt);
          expect(result.totalActual).toEqual(expectedBalance.totalActual);
          expect(result.dailyTarget).toEqual(expectedBalance.dailyTarget);
          expect(result.daysActive).toEqual(expectedBalance.daysActive);

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

  describe("getBalanceHistory", () => {
    type GetBalanceHistoryTestCase = {
      name: string;
      userId: UserId;
      debt: any;
      fromDate: string;
      toDate: string;
      mockActivityLogs: any[];
      expectedHistoryLength: number;
      expectError: boolean;
    };

    const testCases: GetBalanceHistoryTestCase[] = [
      {
        name: "success / 3 days history",
        userId: userId1,
        debt: mockDebtEntity,
        fromDate: "2024-01-01",
        toDate: "2024-01-03",
        mockActivityLogs: mockActivityLogs,
        expectedHistoryLength: 3,
        expectError: false,
      },
      {
        name: "success / single day",
        userId: userId1,
        debt: mockDebtEntity,
        fromDate: "2024-01-01",
        toDate: "2024-01-01",
        mockActivityLogs: [mockActivityLogs[0]],
        expectedHistoryLength: 1,
        expectError: false,
      },
    ];

    testCases.forEach(
      ({
        name,
        userId,
        debt,
        fromDate,
        toDate,
        mockActivityLogs,
        expectedHistoryLength,
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
              service.getBalanceHistory(userId, debt, fromDate, toDate),
            ).rejects.toThrow(Error);
            return;
          }

          const result = await service.getBalanceHistory(
            userId,
            debt,
            fromDate,
            toDate,
          );

          expect(result).toHaveLength(expectedHistoryLength);
          expect(result[0]).toHaveProperty("currentBalance");
          expect(result[0]).toHaveProperty("totalDebt");
          expect(result[0]).toHaveProperty("totalActual");
        });
      },
    );
  });

  describe("adjustDailyTarget", () => {
    type AdjustTargetTestCase = {
      name: string;
      debt: any;
      newTarget: number;
      effectiveDate: string;
      expectedTarget: number;
      expectError?: {
        notPersisted?: Error;
      };
    };

    const testCases: AdjustTargetTestCase[] = [
      {
        name: "success / increase target",
        debt: mockDebtEntity,
        newTarget: 15,
        effectiveDate: "2024-01-05",
        expectedTarget: 15,
      },
      {
        name: "success / decrease target",
        debt: mockDebtEntity,
        newTarget: 5,
        effectiveDate: "2024-01-05",
        expectedTarget: 5,
      },
      {
        name: "failed / non-persisted debt",
        debt: {
          ...mockDebtEntity,
          type: "new",
        },
        newTarget: 15,
        effectiveDate: "2024-01-05",
        expectedTarget: 15,
        expectError: {
          notPersisted: new Error(
            "Cannot adjust target for non-persisted debt",
          ),
        },
      },
    ];

    testCases.forEach(
      ({
        name,
        debt,
        newTarget,
        effectiveDate,
        expectedTarget,
        expectError,
      }) => {
        it(`${name}`, async () => {
          if (expectError?.notPersisted) {
            await expect(
              service.adjustDailyTarget(debt, newTarget, effectiveDate),
            ).rejects.toThrow("Cannot adjust target for non-persisted debt");
            return;
          }

          const result = await service.adjustDailyTarget(
            debt,
            newTarget,
            effectiveDate,
          );

          expect(result.dailyTargetQuantity).toEqual(expectedTarget);
          expect(result.id).toEqual(debt.id);
          expect(result.userId).toEqual(debt.userId);
        });
      },
    );
  });
});
