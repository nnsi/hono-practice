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
import type { ActivityQueryService } from "@backend/query";

describe("ActivityLogUsecase", () => {
  let repo: ActivityLogRepository;
  let acRepo: ActivityRepository;
  let qs: ActivityQueryService;
  let usecase: ReturnType<typeof newActivityLogUsecase>;

  beforeEach(() => {
    repo = mock<ActivityLogRepository>();
    acRepo = mock<ActivityRepository>();
    qs = mock<ActivityQueryService>();
    usecase = newActivityLogUsecase(
      instance(repo),
      instance(acRepo),
      instance(qs),
    );
    reset(repo);
    reset(acRepo);
    reset(qs);
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
  };

  const mockActivityLog: ActivityLog = {
    id: activityLogId1,
    userId: userId1,
    date: "2025-01-01",
    quantity: 5,
    memo: "Good run",
    activity: mockActivity,
    activityKind: mockActivity.kinds![0],
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
});
