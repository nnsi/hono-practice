import {
  type Activity,
  type ActivityId,
  type UserId,
  createActivityId,
  createActivityKindId,
  createUserId,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";
import type { TransactionRunner } from "@backend/infra/rdb/db";
import { noopTracer } from "@backend/lib/tracer";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import type { ActivityRepository } from "..";
import { newActivityUsecase } from "..";

describe("ActivityUsecase", () => {
  let repo: ActivityRepository;
  let tx: TransactionRunner;
  let usecase: ReturnType<typeof newActivityUsecase>;

  beforeEach(() => {
    repo = mock<ActivityRepository>();
    tx = mock<TransactionRunner>();
    usecase = newActivityUsecase(instance(repo), instance(tx), noopTracer);
    reset(repo);
    reset(tx);
  });

  const userId1 = createUserId("00000000-0000-4000-8000-000000000000");
  const activityId1 = createActivityId("00000000-0000-4000-8000-000000000001");
  const activityId2 = createActivityId("00000000-0000-4000-8000-000000000002");

  const activityKindId1 = createActivityKindId(
    "00000000-0000-4000-8000-000000000001",
  );
  const activityKindId2 = createActivityKindId(
    "00000000-0000-4000-8000-000000000002",
  );

  const mockActivity: Activity = {
    id: activityId1,
    userId: userId1,
    name: "Running",
    quantityUnit: "km",
    orderIndex: "a",
    kinds: [],
    type: "new",
    showCombinedStats: true,
    iconType: "emoji",
    emoji: "🏃",
    iconUrl: null,
    iconThumbnailUrl: null,
  };

  const mockActivity2: Activity = {
    id: activityId2,
    userId: userId1,
    name: "Swimming",
    quantityUnit: "m",
    orderIndex: "b",
    kinds: [],
    type: "new",
    showCombinedStats: true,
    iconType: "emoji",
    emoji: "🏊",
    iconUrl: null,
    iconThumbnailUrl: null,
  };

  describe("getActivities", () => {
    type GetActivitiesTestCase = {
      name: string;
      userId: UserId;
      mockReturn: Activity[];
      expectError: boolean;
    };

    const testCases: GetActivitiesTestCase[] = [
      {
        name: "success",
        userId: userId1,
        mockReturn: [mockActivity, mockActivity2],
        expectError: false,
      },
    ];

    testCases.forEach(({ name, userId, mockReturn }) => {
      it(`${name}`, async () => {
        when(repo.getActivitiesByUserId(userId)).thenResolve(mockReturn);

        const result = await usecase.getActivities(userId);
        expect(result).toEqual(mockReturn);

        verify(repo.getActivitiesByUserId(userId)).once();
      });
    });
  });

  describe("getActivity", () => {
    type GetActivityTestCase = {
      name: string;
      userId: UserId;
      activityId: ActivityId;
      mockReturn: Activity | undefined;
      expectError: boolean;
    };

    const testCases: GetActivityTestCase[] = [
      {
        name: "success",
        userId: userId1,
        activityId: activityId1,
        mockReturn: mockActivity,
        expectError: false,
      },
      {
        name: "failed / not found",
        userId: userId1,
        activityId: activityId1,
        mockReturn: undefined,
        expectError: true,
      },
    ];

    testCases.forEach(
      ({ name, userId, activityId, mockReturn, expectError }) => {
        it(`${name}`, async () => {
          when(repo.getActivityByIdAndUserId(userId, activityId)).thenResolve(
            mockReturn,
          );

          if (expectError) {
            await expect(
              usecase.getActivity(userId, activityId),
            ).rejects.toThrow(ResourceNotFoundError);
            return verify(
              repo.getActivityByIdAndUserId(userId, activityId),
            ).once();
          }

          const result = await usecase.getActivity(userId, activityId);
          expect(result).toEqual(mockReturn);

          verify(repo.getActivityByIdAndUserId(userId, activityId)).once();
        });
      },
    );
  });

  describe("createActivity", () => {
    type CreateActivityTestCase = {
      name: string;
      userId: UserId;
      params: {
        name: string;
        label: string;
        emoji: string;
        iconType: "emoji" | "upload" | "generate";
        description?: string;
        quantityUnit: string;
      };
      mockLastOrderIndex: string | undefined;
      mockReturn: Activity;
      expectError: boolean;
    };

    const testCases: CreateActivityTestCase[] = [
      {
        name: "success / first activity",
        userId: userId1,
        params: {
          name: "Running",
          label: "Run",
          emoji: "🏃",
          iconType: "emoji" as const,
          quantityUnit: "km",
        },
        mockLastOrderIndex: undefined,
        mockReturn: {
          ...mockActivity,
          orderIndex: "a",
        },
        expectError: false,
      },
      {
        name: "success / with existing activities",
        userId: userId1,
        params: {
          name: "Swimming",
          label: "Pool",
          emoji: "🏊‍♂️",
          iconType: "emoji" as const,
          description: "Swimming practice",
          quantityUnit: "m",
        },
        mockLastOrderIndex: "a",
        mockReturn: {
          ...mockActivity2,
          orderIndex: "b",
        },
        expectError: false,
      },
    ];

    testCases.forEach(
      ({
        name,
        userId,
        params,
        mockLastOrderIndex,
        mockReturn,
        expectError,
      }) => {
        it(`${name}`, async () => {
          const txRepo = mock<ActivityRepository>();
          when(txRepo.getLastOrderIndexByUserId(userId)).thenResolve(
            mockLastOrderIndex,
          );
          when(txRepo.createActivity(anything())).thenResolve(mockReturn);
          when(tx.run(anything(), anything())).thenCall(
            async (_, callback) => await callback(instance(txRepo)),
          );

          if (expectError) {
            await expect(
              usecase.createActivity(userId, params),
            ).rejects.toThrow();
            return;
          }

          const result = await usecase.createActivity(userId, params);
          expect(result).toEqual(mockReturn);

          verify(txRepo.getLastOrderIndexByUserId(userId)).once();
          verify(txRepo.createActivity(anything())).once();
        });
      },
    );
  });

  describe("updateActivity", () => {
    type UpdateActivityTestCase = {
      name: string;
      userId: UserId;
      activityId: ActivityId;
      params: {
        activity: {
          name: string;
          quantityUnit: string;
          description?: string;
          emoji: string;
          iconType: "emoji" | "upload" | "generate";
        };
        kinds: { id?: string; name: string }[];
      };
      existingActivity: Activity | undefined;
      updatedActivity: Activity;
      expectError: boolean;
    };

    const testCases: UpdateActivityTestCase[] = [
      {
        name: "success",
        userId: userId1,
        activityId: activityId1,
        params: {
          activity: {
            name: "Sprint Running",
            emoji: "🏃",
            iconType: "emoji" as const,
            quantityUnit: "km",
          },
          kinds: [
            { id: activityKindId1, name: "Sprint" },
            { id: activityKindId2, name: "Marathon" },
          ],
        },
        existingActivity: mockActivity,
        updatedActivity: {
          ...mockActivity,
          name: "Sprint Running",
          showCombinedStats: true,
        },
        expectError: false,
      },
      {
        name: "failed / not found",
        userId: userId1,
        activityId: activityId1,
        params: {
          activity: {
            name: "Sprint Running",
            emoji: "🏃",
            iconType: "emoji" as const,
            quantityUnit: "km",
          },
          kinds: [],
        },
        existingActivity: undefined,
        updatedActivity: mockActivity,
        expectError: true,
      },
    ];

    testCases.forEach(
      ({
        name,
        userId,
        activityId,
        params,
        existingActivity,
        updatedActivity,
        expectError,
      }) => {
        it(`${name}`, async () => {
          const txRepo = mock<ActivityRepository>();
          when(txRepo.getActivityByIdAndUserId(userId, activityId)).thenResolve(
            existingActivity,
          );
          when(txRepo.updateActivity(anything())).thenResolve(updatedActivity);
          when(tx.run(anything(), anything())).thenCall(
            async (_, callback) => await callback(instance(txRepo)),
          );

          if (expectError) {
            await expect(
              usecase.updateActivity(userId, activityId, params),
            ).rejects.toThrow(ResourceNotFoundError);
            return;
          }

          const result = await usecase.updateActivity(
            userId,
            activityId,
            params,
          );
          expect(result).toEqual(updatedActivity);

          verify(txRepo.getActivityByIdAndUserId(userId, activityId)).once();
          verify(txRepo.updateActivity(anything())).once();
        });
      },
    );
  });

  describe("updateActivityOrder", () => {
    type UpdateActivityOrderTestCase = {
      name: string;
      userId: UserId;
      activityId: ActivityId;
      params: {
        current: string;
        prev?: string;
        next?: string;
      };
      existingActivities: Activity[];
      updatedActivity: Activity;
      expectError: boolean;
    };

    const testCases: UpdateActivityOrderTestCase[] = [
      {
        name: "success / move between activities",
        userId: userId1,
        activityId: activityId1,
        params: {
          current: activityId1.toString(),
          prev: activityId1.toString(),
          next: activityId2.toString(),
        },
        existingActivities: [mockActivity, mockActivity2],
        updatedActivity: {
          ...mockActivity,
          orderIndex: "ab",
          showCombinedStats: true,
        },
        expectError: false,
      },
      {
        name: "success / move to start",
        userId: userId1,
        activityId: activityId2,
        params: {
          current: activityId2.toString(),
          next: activityId1.toString(),
        },
        existingActivities: [mockActivity, mockActivity2],
        updatedActivity: {
          ...mockActivity2,
          orderIndex: "0",
          showCombinedStats: true,
        },
        expectError: false,
      },
      {
        name: "failed / activity not found",
        userId: userId1,
        activityId: activityId1,
        params: {
          current: activityId1.toString(),
          prev: activityId2.toString(),
        },
        existingActivities: [],
        updatedActivity: mockActivity,
        expectError: true,
      },
    ];

    testCases.forEach(
      ({
        name,
        userId,
        activityId,
        params,
        existingActivities,
        updatedActivity,
        expectError,
      }) => {
        it(`${name}`, async () => {
          const txRepo = mock<ActivityRepository>();
          when(
            txRepo.getActivitiesByIdsAndUserId(userId, anything()),
          ).thenResolve(existingActivities);
          when(txRepo.updateActivity(anything())).thenResolve(updatedActivity);
          when(tx.run(anything(), anything())).thenCall(
            async (_, callback) => await callback(instance(txRepo)),
          );

          if (expectError) {
            await expect(
              usecase.updateActivityOrder(userId, activityId, params),
            ).rejects.toThrow(ResourceNotFoundError);
            return;
          }

          const result = await usecase.updateActivityOrder(
            userId,
            activityId,
            params,
          );
          expect(result).toEqual(updatedActivity);

          verify(txRepo.getActivitiesByIdsAndUserId(userId, anything())).once();
          verify(txRepo.updateActivity(anything())).once();
        });
      },
    );
  });

  describe("deleteActivity", () => {
    type DeleteActivityTestCase = {
      name: string;
      userId: UserId;
      activityId: ActivityId;
      existingActivity: Activity | undefined;
      expectError: boolean;
    };

    const testCases: DeleteActivityTestCase[] = [
      {
        name: "success",
        userId: userId1,
        activityId: activityId1,
        existingActivity: mockActivity,
        expectError: false,
      },
      {
        name: "failed / not found",
        userId: userId1,
        activityId: activityId1,
        existingActivity: undefined,
        expectError: true,
      },
    ];

    testCases.forEach(
      ({ name, userId, activityId, existingActivity, expectError }) => {
        it(`${name}`, async () => {
          when(repo.getActivityByIdAndUserId(userId, activityId)).thenResolve(
            existingActivity,
          );

          if (expectError) {
            await expect(
              usecase.deleteActivity(userId, activityId),
            ).rejects.toThrow(ResourceNotFoundError);
            return verify(
              repo.getActivityByIdAndUserId(userId, activityId),
            ).once();
          }

          await usecase.deleteActivity(userId, activityId);

          verify(repo.getActivityByIdAndUserId(userId, activityId)).once();
          verify(repo.deleteActivity(existingActivity!)).once();
        });
      },
    );
  });
});
