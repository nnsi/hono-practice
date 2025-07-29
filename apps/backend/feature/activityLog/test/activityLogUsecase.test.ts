import {
  type Activity,
  type ActivityId,
  type ActivityKind,
  type ActivityKindId,
  type ActivityLog,
  type ActivityLogId,
  type UserId,
  createActivityId,
  createActivityKindId,
  createActivityLogId,
  createUserId,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import { type ActivityLogRepository, newActivityLogUsecase } from "..";

import type { ActivityRepository } from "../../activity";
import type { QueryExecutor } from "@backend/infra/rdb/drizzle";
import type { ActivityQueryService } from "@backend/query";

describe("ActivityLogUsecase", () => {
  let repo: ActivityLogRepository;
  let acRepo: ActivityRepository;
  let qs: ActivityQueryService;
  let db: QueryExecutor;
  let usecase: ReturnType<typeof newActivityLogUsecase>;

  beforeEach(() => {
    repo = mock<ActivityLogRepository>();
    acRepo = mock<ActivityRepository>();
    qs = mock<ActivityQueryService>();
    db = mock<QueryExecutor>();
    usecase = newActivityLogUsecase(
      instance(repo),
      instance(acRepo),
      instance(qs),
      instance(db),
    );
    reset(repo);
    reset(acRepo);
    reset(qs);
    reset(db);
  });

  const userId1 = createUserId("00000000-0000-4000-8000-000000000000");
  const activityLogId1 = createActivityLogId(
    "00000000-0000-4000-8000-000000000001",
  );
  const activityId1 = createActivityId("00000000-0000-4000-8000-000000000002");
  const activityKindId1 = createActivityKindId(
    "00000000-0000-4000-8000-000000000003",
  );

  const mockActivityKind: ActivityKind = {
    id: activityKindId1,
    name: "Sprint",
    orderIndex: "1",
  };

  const mockActivity: Activity = {
    id: activityId1,
    userId: userId1,
    name: "Running",
    quantityUnit: "km",
    orderIndex: "1",
    kinds: [mockActivityKind],
    type: "new",
    showCombinedStats: true,
    iconType: "emoji",
    emoji: "🏃",
    iconUrl: null,
    iconThumbnailUrl: null,
  };

  const mockActivityLog: ActivityLog = {
    id: activityLogId1,
    userId: userId1,
    date: "2025-01-01",
    quantity: 5,
    memo: "Good run",
    activity: mockActivity,
    activityKind: mockActivity.kinds![0],
    type: "new",
  };

  describe("getActivityLogs", () => {
    type GetActivityLogsTestCase = {
      name: string;
      userId: UserId;
      params: { from: Date; to: Date };
      mockReturn: ActivityLog[] | undefined;
      expectError: boolean;
    };

    const testCases: GetActivityLogsTestCase[] = [
      {
        name: "success",
        userId: userId1,
        params: {
          from: new Date("2025-01-01"),
          to: new Date("2025-01-31"),
        },
        mockReturn: [mockActivityLog],
        expectError: false,
      },
      {
        name: "failed / getActivityLogsByUserIdAndDate error",
        userId: userId1,
        params: {
          from: new Date("2025-01-01"),
          to: new Date("2025-01-31"),
        },
        mockReturn: undefined,
        expectError: true,
      },
    ];

    testCases.forEach(({ name, userId, params, mockReturn, expectError }) => {
      it(`${name}`, async () => {
        if (expectError) {
          when(
            repo.getActivityLogsByUserIdAndDate(userId, params.from, params.to),
          ).thenReject(new Error());

          await expect(usecase.getActivityLogs(userId, params)).rejects.toThrow(
            Error,
          );
          return verify(
            repo.getActivityLogsByUserIdAndDate(userId, params.from, params.to),
          ).once();
        }

        when(
          repo.getActivityLogsByUserIdAndDate(userId, params.from, params.to),
        ).thenResolve(mockReturn ?? []);

        const result = await usecase.getActivityLogs(userId, params);
        expect(result).toEqual(mockReturn);

        verify(
          repo.getActivityLogsByUserIdAndDate(userId, params.from, params.to),
        ).once();
      });
    });
  });

  describe("getActivityLog", () => {
    type GetActivityLogTestCase = {
      name: string;
      userId: UserId;
      activityLogId: ActivityLogId;
      mockReturn: ActivityLog | undefined;
      expectError?: {
        getActivityLog?: Error;
        notFound?: ResourceNotFoundError;
      };
    };

    const testCases: GetActivityLogTestCase[] = [
      {
        name: "success",
        userId: userId1,
        activityLogId: activityLogId1,
        mockReturn: mockActivityLog,
      },
      {
        name: "failed / not found",
        userId: userId1,
        activityLogId: activityLogId1,
        mockReturn: undefined,
        expectError: {
          notFound: new ResourceNotFoundError("activity log not found"),
        },
      },
      {
        name: "failed / getActivityLogByIdAndUserId error",
        userId: userId1,
        activityLogId: activityLogId1,
        mockReturn: undefined,
        expectError: {
          getActivityLog: new Error(),
        },
      },
    ];

    testCases.forEach(
      ({ name, userId, activityLogId, mockReturn, expectError }) => {
        it(`${name}`, async () => {
          if (expectError?.getActivityLog) {
            when(
              repo.getActivityLogByIdAndUserId(userId, activityLogId),
            ).thenReject(expectError.getActivityLog);

            await expect(
              usecase.getActivityLog(userId, activityLogId),
            ).rejects.toThrow(Error);
            return verify(
              repo.getActivityLogByIdAndUserId(userId, activityLogId),
            ).once();
          }

          when(
            repo.getActivityLogByIdAndUserId(userId, activityLogId),
          ).thenResolve(mockReturn);

          if (expectError?.notFound) {
            await expect(
              usecase.getActivityLog(userId, activityLogId),
            ).rejects.toThrow(ResourceNotFoundError);
            return verify(
              repo.getActivityLogByIdAndUserId(userId, activityLogId),
            ).once();
          }

          const result = await usecase.getActivityLog(userId, activityLogId);
          expect(result).toEqual(mockReturn);

          verify(
            repo.getActivityLogByIdAndUserId(userId, activityLogId),
          ).once();
          expect(expectError).toBeUndefined();
        });
      },
    );
  });

  describe("createActivityLog", () => {
    type CreateActivityLogTestCase = {
      name: string;
      userId: UserId;
      activityId: ActivityId;
      activityKindId: ActivityKindId;
      params: {
        date: string;
        quantity: number;
        memo?: string;
      };
      mockActivity: Activity | undefined;
      mockReturn: ActivityLog | undefined;
      expectError?: {
        activityNotFound?: Error;
        createActivityLog?: Error;
      };
    };

    const testCases: CreateActivityLogTestCase[] = [
      {
        name: "success",
        userId: userId1,
        activityId: activityId1,
        activityKindId: activityKindId1,
        params: {
          date: "2025-01-01",
          quantity: 5,
          memo: "Good run",
        },
        mockActivity: mockActivity,
        mockReturn: mockActivityLog,
      },
      {
        name: "failed / activity not found",
        userId: userId1,
        activityId: activityId1,
        activityKindId: activityKindId1,
        params: {
          date: "2025-01-01",
          quantity: 5,
        },
        mockActivity: undefined,
        mockReturn: undefined,
        expectError: {
          activityNotFound: new Error("activity not found"),
        },
      },
      {
        name: "failed / createActivityLog error",
        userId: userId1,
        activityId: activityId1,
        activityKindId: activityKindId1,
        params: {
          date: "2025-01-01",
          quantity: 5,
        },
        mockActivity: mockActivity,
        mockReturn: undefined,
        expectError: {
          createActivityLog: new Error(),
        },
      },
    ];

    testCases.forEach(
      ({
        name,
        userId,
        activityId,
        activityKindId,
        params,
        mockActivity,
        mockReturn,
        expectError,
      }) => {
        it(`${name}`, async () => {
          when(acRepo.getActivityByIdAndUserId(userId, activityId)).thenResolve(
            mockActivity,
          );

          if (expectError?.activityNotFound) {
            await expect(
              usecase.createActivityLog(
                userId,
                activityId,
                activityKindId,
                params,
              ),
            ).rejects.toThrow("activity not found");
            return verify(
              acRepo.getActivityByIdAndUserId(userId, activityId),
            ).once();
          }

          if (expectError?.createActivityLog) {
            when(repo.createActivityLog(anything())).thenReject(
              expectError.createActivityLog,
            );
            await expect(
              usecase.createActivityLog(
                userId,
                activityId,
                activityKindId,
                params,
              ),
            ).rejects.toThrow(Error);
            return verify(repo.createActivityLog(anything())).once();
          }

          when(repo.createActivityLog(anything())).thenResolve(
            mockReturn ?? mockActivityLog,
          );

          const result = await usecase.createActivityLog(
            userId,
            activityId,
            activityKindId,
            params,
          );
          expect(result).toEqual(mockReturn);

          verify(repo.createActivityLog(anything())).once();
          expect(expectError).toBeUndefined();
        });
      },
    );
  });

  describe("updateActivityLog", () => {
    type UpdateActivityLogTestCase = {
      name: string;
      userId: UserId;
      activityLogId: ActivityLogId;
      params: {
        quantity?: number;
        memo?: string;
      };
      existingActivityLog: ActivityLog | undefined;
      updatedActivityLog: ActivityLog | undefined;
      expectError?: {
        notFound?: ResourceNotFoundError;
        updateActivityLog?: Error;
      };
    };

    const testCases: UpdateActivityLogTestCase[] = [
      {
        name: "success",
        userId: userId1,
        activityLogId: activityLogId1,
        params: {
          quantity: 10,
          memo: "Updated run",
        },
        existingActivityLog: mockActivityLog,
        updatedActivityLog: {
          ...mockActivityLog,
          quantity: 10,
          memo: "Updated run",
        },
      },
      {
        name: "failed / not found",
        userId: userId1,
        activityLogId: activityLogId1,
        params: {
          quantity: 10,
        },
        existingActivityLog: undefined,
        updatedActivityLog: undefined,
        expectError: {
          notFound: new ResourceNotFoundError("activity log not found"),
        },
      },
      {
        name: "failed / updateActivityLog error",
        userId: userId1,
        activityLogId: activityLogId1,
        params: {
          quantity: 10,
        },
        existingActivityLog: mockActivityLog,
        updatedActivityLog: undefined,
        expectError: {
          updateActivityLog: new Error(),
        },
      },
    ];

    testCases.forEach(
      ({
        name,
        userId,
        activityLogId,
        params,
        existingActivityLog,
        updatedActivityLog,
        expectError,
      }) => {
        it(`${name}`, async () => {
          when(
            repo.getActivityLogByIdAndUserId(userId, activityLogId),
          ).thenResolve(existingActivityLog);

          if (expectError?.notFound) {
            await expect(
              usecase.updateActivityLog(userId, activityLogId, params),
            ).rejects.toThrow(ResourceNotFoundError);
            return verify(
              repo.getActivityLogByIdAndUserId(userId, activityLogId),
            ).once();
          }

          if (expectError?.updateActivityLog) {
            when(repo.updateActivityLog(anything())).thenReject(
              expectError.updateActivityLog,
            );
            await expect(
              usecase.updateActivityLog(userId, activityLogId, params),
            ).rejects.toThrow(Error);
            return verify(repo.updateActivityLog(anything())).once();
          }

          when(repo.updateActivityLog(anything())).thenResolve(
            updatedActivityLog ?? mockActivityLog,
          );

          const result = await usecase.updateActivityLog(
            userId,
            activityLogId,
            params,
          );
          expect(result).toEqual(updatedActivityLog);

          verify(repo.updateActivityLog(anything())).once();
          expect(expectError).toBeUndefined();
        });
      },
    );
  });

  describe("deleteActivityLog", () => {
    type DeleteActivityLogTestCase = {
      name: string;
      userId: UserId;
      activityLogId: ActivityLogId;
      existingActivityLog: ActivityLog | undefined;
      expectError?: {
        notFound?: ResourceNotFoundError;
        deleteActivityLog?: Error;
      };
    };

    const testCases: DeleteActivityLogTestCase[] = [
      {
        name: "success",
        userId: userId1,
        activityLogId: activityLogId1,
        existingActivityLog: mockActivityLog,
      },
      {
        name: "failed / not found",
        userId: userId1,
        activityLogId: activityLogId1,
        existingActivityLog: undefined,
        expectError: {
          notFound: new ResourceNotFoundError("activity log not found"),
        },
      },
      {
        name: "failed / deleteActivityLog error",
        userId: userId1,
        activityLogId: activityLogId1,
        existingActivityLog: mockActivityLog,
        expectError: {
          deleteActivityLog: new Error(),
        },
      },
    ];

    testCases.forEach(
      ({ name, userId, activityLogId, existingActivityLog, expectError }) => {
        it(`${name}`, async () => {
          when(
            repo.getActivityLogByIdAndUserId(userId, activityLogId),
          ).thenResolve(existingActivityLog);

          if (expectError?.notFound) {
            await expect(
              usecase.deleteActivityLog(userId, activityLogId),
            ).rejects.toThrow(ResourceNotFoundError);
            return verify(
              repo.getActivityLogByIdAndUserId(userId, activityLogId),
            ).once();
          }

          if (expectError?.deleteActivityLog && existingActivityLog) {
            when(repo.deleteActivityLog(existingActivityLog)).thenReject(
              expectError.deleteActivityLog,
            );
            await expect(
              usecase.deleteActivityLog(userId, activityLogId),
            ).rejects.toThrow(Error);
            return verify(repo.deleteActivityLog(existingActivityLog)).once();
          }

          if (existingActivityLog) {
            await usecase.deleteActivityLog(userId, activityLogId);
            verify(repo.deleteActivityLog(existingActivityLog)).once();
          }

          verify(
            repo.getActivityLogByIdAndUserId(userId, activityLogId),
          ).once();
          expect(expectError).toBeUndefined();
        });
      },
    );
  });

  describe("getStats", () => {
    type GetStatsTestCase = {
      name: string;
      userId: UserId;
      params: {
        from: Date;
        to: Date;
      };
      mockReturn: any;
      expectError: boolean;
    };

    const testCases: GetStatsTestCase[] = [
      {
        name: "success",
        userId: userId1,
        params: {
          from: new Date("2025-01-01"),
          to: new Date("2025-01-31"),
        },
        mockReturn: {
          totalActivities: 10,
          totalTime: 500,
          activities: [],
        },
        expectError: false,
      },
      {
        name: "failed / activityStatsQuery error",
        userId: userId1,
        params: {
          from: new Date("2025-01-01"),
          to: new Date("2025-01-31"),
        },
        mockReturn: undefined,
        expectError: true,
      },
    ];

    testCases.forEach(({ name, userId, params, mockReturn, expectError }) => {
      it(`${name}`, async () => {
        if (expectError) {
          when(
            qs.activityStatsQuery(userId, params.from, params.to),
          ).thenReject(new Error());

          await expect(usecase.getStats(userId, params)).rejects.toThrow(Error);
          return verify(
            qs.activityStatsQuery(userId, params.from, params.to),
          ).once();
        }

        when(qs.activityStatsQuery(userId, params.from, params.to)).thenResolve(
          mockReturn,
        );

        const result = await usecase.getStats(userId, params);
        expect(result).toEqual(mockReturn);

        verify(qs.activityStatsQuery(userId, params.from, params.to)).once();
      });
    });
  });

  describe("createActivityLogBatch", () => {
    type CreateActivityLogBatchTestCase = {
      name: string;
      userId: UserId;
      activityLogs: Array<{
        date: string;
        quantity: number;
        memo?: string;
        activityId: string;
        activityKindId?: string;
      }>;
      mockActivities: Array<Activity | undefined>;
      mockCreatedLogs: ActivityLog[];
      mockTransaction?: {
        error?: Error;
      };
      expectedResponse?: {
        summary: {
          total: number;
          succeeded: number;
          failed: number;
        };
      };
      expectError?: boolean;
    };

    const mockActivityLogBatch: ActivityLog[] = [
      {
        ...mockActivityLog,
        id: createActivityLogId("00000000-0000-4000-8000-000000000010"),
        date: "2025-01-01",
        quantity: 5,
      },
      {
        ...mockActivityLog,
        id: createActivityLogId("00000000-0000-4000-8000-000000000011"),
        date: "2025-01-02",
        quantity: 10,
      },
    ];

    const testCases: CreateActivityLogBatchTestCase[] = [
      {
        name: "success - 複数のアクティビティログを一括作成",
        userId: userId1,
        activityLogs: [
          {
            date: "2025-01-01",
            quantity: 5,
            memo: "Morning run",
            activityId: activityId1,
            activityKindId: activityKindId1,
          },
          {
            date: "2025-01-02",
            quantity: 10,
            memo: "Evening run",
            activityId: activityId1,
            activityKindId: activityKindId1,
          },
        ],
        mockActivities: [mockActivity, mockActivity],
        mockCreatedLogs: mockActivityLogBatch,
        expectedResponse: {
          summary: {
            total: 2,
            succeeded: 2,
            failed: 0,
          },
        },
      },
      {
        name: "failed - アクティビティが見つからない",
        userId: userId1,
        activityLogs: [
          {
            date: "2025-01-01",
            quantity: 5,
            activityId: "00000000-0000-4000-8000-000000000999",
          },
        ],
        mockActivities: [undefined],
        mockCreatedLogs: [],
        expectError: true,
      },
      {
        name: "failed - トランザクションエラー",
        userId: userId1,
        activityLogs: [
          {
            date: "2025-01-01",
            quantity: 5,
            activityId: activityId1,
          },
        ],
        mockActivities: [mockActivity],
        mockCreatedLogs: [],
        mockTransaction: {
          error: new Error("Database error"),
        },
        expectedResponse: {
          summary: {
            total: 1,
            succeeded: 0,
            failed: 1,
          },
        },
      },
    ];

    testCases.forEach(
      ({
        name,
        userId,
        activityLogs,
        mockActivities,
        mockCreatedLogs,
        mockTransaction,
        expectedResponse,
        expectError,
      }) => {
        it(`${name}`, async () => {
          // トランザクションのモック設定
          const txRepo = mock<ActivityLogRepository>();
          const txAcRepo = mock<ActivityRepository>();

          when(repo.withTx(anything())).thenReturn(instance(txRepo));
          when(acRepo.withTx(anything())).thenReturn(instance(txAcRepo));

          // アクティビティの取得をモック
          activityLogs.forEach((log, index) => {
            const activityId = createActivityId(log.activityId);
            when(
              txAcRepo.getActivityByIdAndUserId(userId, activityId),
            ).thenResolve(mockActivities[index]);
          });

          // バッチ作成のモック
          when(txRepo.createActivityLogBatch(anything())).thenResolve(
            mockCreatedLogs,
          );

          if (mockTransaction?.error) {
            // トランザクションエラーをシミュレート
            when(db.transaction(anything())).thenReject(mockTransaction.error);

            const result = await usecase.createActivityLogBatch(
              userId,
              activityLogs,
            );

            expect(result.summary.failed).toBe(activityLogs.length);
            expect(result.summary.succeeded).toBe(0);
            expect(result.results.every((r) => !r.success)).toBe(true);
            return;
          }

          if (expectError) {
            // トランザクション内でエラーをスロー
            when(db.transaction(anything())).thenCall(async () => {
              throw new Error(
                "Activity not found: 00000000-0000-4000-8000-000000000999",
              );
            });

            const result = await usecase.createActivityLogBatch(
              userId,
              activityLogs,
            );

            expect(result.summary.failed).toBe(activityLogs.length);
            expect(result.summary.succeeded).toBe(0);
            expect(result.results.every((r) => !r.success)).toBe(true);
            return;
          }

          // 正常系: トランザクションを実行
          when(db.transaction(anything())).thenCall(async (callback) => {
            return callback({ withTx: () => {} } as any);
          });

          const result = await usecase.createActivityLogBatch(
            userId,
            activityLogs,
          );

          expect(result.summary).toEqual(expectedResponse?.summary);
          expect(result.results).toHaveLength(activityLogs.length);
          result.results.forEach((r, index) => {
            expect(r.success).toBe(true);
            expect(r.index).toBe(index);
            expect(r.activityLogId).toBe(mockCreatedLogs[index].id);
          });

          verify(db.transaction(anything())).once();
        });
      },
    );

    it("アクティビティ種別が存在しない場合でも正常に処理される", async () => {
      const activityWithoutKinds: Activity = {
        ...mockActivity,
        kinds: undefined as any,
      };

      const txRepo = mock<ActivityLogRepository>();
      const txAcRepo = mock<ActivityRepository>();

      when(repo.withTx(anything())).thenReturn(instance(txRepo));
      when(acRepo.withTx(anything())).thenReturn(instance(txAcRepo));

      when(txAcRepo.getActivityByIdAndUserId(userId1, activityId1)).thenResolve(
        activityWithoutKinds,
      );

      when(txRepo.createActivityLogBatch(anything())).thenResolve([
        mockActivityLog,
      ]);

      when(db.transaction(anything())).thenCall(async (callback) => {
        return callback({ withTx: () => {} } as any);
      });

      const result = await usecase.createActivityLogBatch(userId1, [
        {
          date: "2025-01-01",
          quantity: 5,
          activityId: activityId1,
          activityKindId: activityKindId1,
        },
      ]);

      expect(result.summary.succeeded).toBe(1);
      expect(result.summary.failed).toBe(0);
    });

    it("空の配列を渡した場合は空の結果を返す", async () => {
      const result = await usecase.createActivityLogBatch(userId1, []);

      expect(result.summary.total).toBe(0);
      expect(result.summary.succeeded).toBe(0);
      expect(result.summary.failed).toBe(0);
      expect(result.results).toEqual([]);
    });
  });
});
