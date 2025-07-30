import {
  createActivityGoalEntity,
  createActivityId,
  createActivityLogId,
  createUserId,
} from "@backend/domain";
import { anything, instance, mock, reset, when } from "ts-mockito";
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
  const goalId1 = "00000000-0000-4000-8000-000000000002" as any;

  const mockGoalEntity = createActivityGoalEntity({
    type: "persisted",
    id: goalId1,
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
        userId: userId1,
        name: "Test Activity",
        label: "",
        emoji: "",
        description: "",
        quantityUnit: "",
        orderIndex: "",
        kinds: [],
        showCombinedStats: true,
        iconType: "emoji" as const,
        iconUrl: null,
        iconThumbnailUrl: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      },
      activityId: activityId1,
      activityKind: null,
      activityKindId: null,
      quantity: 5,
      memo: "",
      date: "2024-01-01",
      time: null,
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
        userId: userId1,
        name: "Test Activity",
        label: "",
        emoji: "",
        description: "",
        quantityUnit: "",
        orderIndex: "",
        kinds: [],
        showCombinedStats: true,
        iconType: "emoji" as const,
        iconUrl: null,
        iconThumbnailUrl: null,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      },
      activityId: activityId1,
      activityKind: null,
      activityKindId: null,
      quantity: 15,
      memo: "",
      date: "2024-01-02",
      time: null,
      createdAt: new Date("2024-01-02T00:00:00Z"),
      updatedAt: new Date("2024-01-02T00:00:00Z"),
    },
  ];

  describe("calculateCurrentBalance", () => {
    it("should calculate balance correctly when actual < target", async () => {
      when(
        activityLogRepo.getActivityLogsByUserIdAndDate(
          userId1,
          anything(),
          anything(),
        ),
      ).thenResolve(mockActivityLogs);

      const balance = await service.calculateCurrentBalance(
        userId1,
        mockGoalEntity,
        "2024-01-10",
      );

      // 10日間 × 10/日 = 100 (目標)
      // 実績: 5 + 15 = 20
      // バランス: 20 - 100 = -80
      expect(balance).toEqual({
        currentBalance: -80,
        totalTarget: 100,
        totalActual: 20,
        dailyTarget: 10,
        daysActive: 10,
        lastCalculatedDate: "2024-01-10",
      });
    });

    it("should calculate balance correctly when actual > target", async () => {
      const highActivityLogs = [
        ...mockActivityLogs,
        {
          type: "persisted" as const,
          id: createActivityLogId("00000000-0000-4000-8000-000000000005"),
          userId: userId1,
          activity: mockActivityLogs[0].activity,
          activityId: activityId1,
          activityKind: null,
          activityKindId: null,
          quantity: 100,
          memo: "",
          date: "2024-01-03",
          time: null,
          createdAt: new Date("2024-01-03T00:00:00Z"),
          updatedAt: new Date("2024-01-03T00:00:00Z"),
        },
      ];

      when(
        activityLogRepo.getActivityLogsByUserIdAndDate(
          userId1,
          anything(),
          anything(),
        ),
      ).thenResolve(highActivityLogs);

      const balance = await service.calculateCurrentBalance(
        userId1,
        mockGoalEntity,
        "2024-01-03",
      );

      // 3日間 × 10/日 = 30 (目標)
      // 実績: 5 + 15 + 100 = 120
      // バランス: 120 - 30 = 90
      expect(balance).toEqual({
        currentBalance: 90,
        totalTarget: 30,
        totalActual: 120,
        dailyTarget: 10,
        daysActive: 3,
        lastCalculatedDate: "2024-01-03",
      });
    });

    it("should use endDate if provided and before calculate date", async () => {
      const goalWithEndDate = createActivityGoalEntity({
        ...mockGoalEntity,
        endDate: "2024-01-05",
      });

      when(
        activityLogRepo.getActivityLogsByUserIdAndDate(
          userId1,
          anything(),
          anything(),
        ),
      ).thenResolve(mockActivityLogs);

      const balance = await service.calculateCurrentBalance(
        userId1,
        goalWithEndDate,
        "2024-01-10", // calculate date is after endDate
      );

      // endDateまでの5日間で計算
      expect(balance.daysActive).toBe(5);
      expect(balance.lastCalculatedDate).toBe("2024-01-05");
    });
  });

  describe("getBalanceHistory", () => {
    it("should return daily balance history", async () => {
      // 全ての呼び出しに対して同じデータを返す
      when(
        activityLogRepo.getActivityLogsByUserIdAndDate(
          userId1,
          anything(),
          anything(),
        ),
      ).thenResolve(mockActivityLogs);

      const history = await service.getBalanceHistory(
        userId1,
        mockGoalEntity,
        "2024-01-01",
        "2024-01-03",
      );

      expect(history).toHaveLength(3);

      // Day 1: target 10, actual 20 (全データ), balance 10
      expect(history[0]).toEqual({
        currentBalance: 10,
        totalTarget: 10,
        totalActual: 20,
        dailyTarget: 10,
        daysActive: 1,
        lastCalculatedDate: "2024-01-01",
      });

      // Day 2: target 20, actual 20, balance 0
      expect(history[1]).toEqual({
        currentBalance: 0,
        totalTarget: 20,
        totalActual: 20,
        dailyTarget: 10,
        daysActive: 2,
        lastCalculatedDate: "2024-01-02",
      });

      // Day 3: target 30, actual 20, balance -10
      expect(history[2]).toEqual({
        currentBalance: -10,
        totalTarget: 30,
        totalActual: 20,
        dailyTarget: 10,
        daysActive: 3,
        lastCalculatedDate: "2024-01-03",
      });
    });
  });

  describe("adjustDailyTarget", () => {
    it("should create a new goal with adjusted target", async () => {
      const adjusted = await service.adjustDailyTarget(
        mockGoalEntity,
        15,
        "2024-02-01",
      );

      expect(adjusted.dailyTargetQuantity).toBe(15);
      // 元の目標は非アクティブに
      expect(mockGoalEntity.isActive).toBe(false);
      expect(mockGoalEntity.endDate).toBe("2024-01-31");
    });
  });
});
