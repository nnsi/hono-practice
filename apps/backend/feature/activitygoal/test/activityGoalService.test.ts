import { createActivityId } from "@packages/domain/activity/activitySchema";
import { createActivityGoalEntity } from "@packages/domain/goal/goalSchema";
import { createUserId } from "@packages/domain/user/userSchema";
import { anything, instance, mock, reset, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import type { ActivityLogRepository } from "../../activityLog";
import { newActivityGoalService } from "../activityGoalService";

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

  const mockActivityLogSummaries = [
    {
      activityId: activityId1,
      quantity: 5,
      date: "2024-01-01",
    },
    {
      activityId: activityId1,
      quantity: 15,
      date: "2024-01-02",
    },
  ];

  describe("calculateCurrentBalance", () => {
    it("should calculate balance correctly when actual < target", async () => {
      when(
        activityLogRepo.getActivityLogSummariesByUserIdAndDate(
          userId1,
          anything(),
          anything(),
        ),
      ).thenResolve(mockActivityLogSummaries);

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
        ...mockActivityLogSummaries,
        {
          activityId: activityId1,
          quantity: 100,
          date: "2024-01-03",
        },
      ];

      when(
        activityLogRepo.getActivityLogSummariesByUserIdAndDate(
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
        activityLogRepo.getActivityLogSummariesByUserIdAndDate(
          userId1,
          anything(),
          anything(),
        ),
      ).thenResolve(mockActivityLogSummaries);

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
        activityLogRepo.getActivityLogSummariesByUserIdAndDate(
          userId1,
          anything(),
          anything(),
        ),
      ).thenResolve(mockActivityLogSummaries);

      const history = await service.getBalanceHistory(
        userId1,
        mockGoalEntity,
        "2024-01-01",
        "2024-01-03",
      );

      expect(history).toHaveLength(3);

      // Day 1: target 10, actual 5 (1/1のログのみ), balance -5
      expect(history[0]).toEqual({
        currentBalance: -5,
        totalTarget: 10,
        totalActual: 5,
        dailyTarget: 10,
        daysActive: 1,
        lastCalculatedDate: "2024-01-01",
      });

      // Day 2: target 20, actual 20 (1/1 + 1/2のログ), balance 0
      expect(history[1]).toEqual({
        currentBalance: 0,
        totalTarget: 20,
        totalActual: 20,
        dailyTarget: 10,
        daysActive: 2,
        lastCalculatedDate: "2024-01-02",
      });

      // Day 3: target 30, actual 20 (1/1 + 1/2のログ), balance -10
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
