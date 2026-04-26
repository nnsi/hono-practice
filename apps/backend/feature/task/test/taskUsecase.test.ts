import { ResourceNotFoundError } from "@backend/error";
import { noopTracer } from "@backend/lib/tracer";
import {
  type Activity,
  type ActivityId,
  type ActivityKindId,
  createActivityId,
  createActivityKindId,
} from "@packages/domain/activity/activitySchema";
import {
  type Task,
  type TaskId,
  createTaskId,
} from "@packages/domain/task/taskSchema";
import { type UserId, createUserId } from "@packages/domain/user/userSchema";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import type { ActivityRepository } from "../../activity";
import { type TaskRepository, newTaskUsecase } from "..";

describe("TaskUsecase", () => {
  let repo: TaskRepository;
  let activityRepo: ActivityRepository;
  let usecase: ReturnType<typeof newTaskUsecase>;

  beforeEach(() => {
    repo = mock<TaskRepository>();
    activityRepo = mock<ActivityRepository>();
    usecase = newTaskUsecase(
      instance(repo),
      instance(activityRepo),
      noopTracer,
    );
    reset(repo);
    reset(activityRepo);
  });

  const userId1 = createUserId("00000000-0000-4000-8000-000000000000");
  const taskId1 = createTaskId("00000000-0000-4000-8000-000000000001");
  const taskId2 = createTaskId("00000000-0000-4000-8000-000000000002");
  const activityId1 = createActivityId("00000000-0000-4000-8000-000000000003");
  const activityId2 = createActivityId("00000000-0000-4000-8000-000000000004");
  const activityKindId1 = createActivityKindId(
    "00000000-0000-4000-8000-000000000005",
  );

  function makeActivity(
    id: ActivityId,
    kindIds: ActivityKindId[] = [],
  ): Activity {
    return {
      id,
      userId: userId1,
      name: "Running",
      quantityUnit: "km",
      orderIndex: "1",
      kinds: kindIds.map((kindId, index) => ({
        id: kindId,
        name: `Kind ${index}`,
        orderIndex: String(index),
      })),
      type: "new",
      showCombinedStats: true,
      iconType: "emoji",
      emoji: null,
      iconUrl: null,
      iconThumbnailUrl: null,
      recordingMode: "manual",
    };
  }

  describe("getTasks", () => {
    type GetTasksTestCase = {
      name: string;
      userId: UserId;
      mockReturn: Task[] | undefined;
      expectError: boolean;
    };

    const testCases: GetTasksTestCase[] = [
      {
        name: "success",
        userId: userId1,
        mockReturn: [
          {
            id: taskId1,
            userId: userId1,
            title: "dummy1",
            doneDate: null,
            memo: null,
            type: "new",
          },
          {
            id: taskId2,
            userId: userId1,
            title: "dummy2",
            doneDate: "2021-01-01",
            memo: "test",
            type: "new",
          },
        ],
        expectError: false,
      },
      {
        name: "failed / getTaskAllByUserId error",
        userId: userId1,
        mockReturn: undefined,
        expectError: true,
      },
    ];

    testCases.forEach(({ name, userId, mockReturn, expectError }) => {
      it(`${name}`, async () => {
        if (expectError) {
          when(repo.getTasksByUserId(userId, undefined)).thenReject(
            new Error(),
          );

          await expect(usecase.getTasks(userId, undefined)).rejects.toThrow(
            Error,
          );
          return verify(repo.getTasksByUserId(userId, undefined)).once();
        }

        when(repo.getTasksByUserId(userId, undefined)).thenResolve(mockReturn!);

        const result = await usecase.getTasks(userId, undefined);
        expect(result).toEqual(mockReturn);

        verify(repo.getTasksByUserId(userId, undefined)).once();
      });
    });
  });

  describe("getTask", () => {
    type GetTaskTestCase = {
      name: string;
      userId: UserId;
      taskId: TaskId;
      mockReturn: Task | undefined;
      expectError?: {
        getTask?: Error;
        taskNotFound?: ResourceNotFoundError;
      };
    };

    const testCases: GetTaskTestCase[] = [
      {
        name: "success",
        userId: userId1,
        taskId: taskId1,
        mockReturn: {
          id: taskId1,
          userId: userId1,
          title: "dummy",
          doneDate: null,
          memo: null,
          type: "new",
        },
      },
      {
        name: "failed / not found",
        userId: userId1,
        taskId: taskId1,
        mockReturn: undefined,
        expectError: {
          taskNotFound: new ResourceNotFoundError("task not found"),
        },
      },
      {
        name: "failed / getTaskByUserIdAndTaskId error",
        userId: userId1,
        taskId: taskId1,
        mockReturn: undefined,
        expectError: {
          getTask: new Error(),
        },
      },
    ];

    testCases.forEach(({ name, userId, taskId, mockReturn, expectError }) => {
      it(`${name}`, async () => {
        if (expectError?.getTask) {
          when(repo.getTaskByUserIdAndTaskId(userId, taskId)).thenReject(
            expectError.getTask,
          );

          await expect(usecase.getTask(userId, taskId)).rejects.toThrow(Error);
          return verify(repo.getTaskByUserIdAndTaskId(userId, taskId)).once();
        }

        when(repo.getTaskByUserIdAndTaskId(userId, taskId)).thenResolve(
          mockReturn,
        );

        if (expectError?.taskNotFound) {
          await expect(usecase.getTask(userId, taskId)).rejects.toThrow(
            ResourceNotFoundError,
          );
          return verify(repo.getTaskByUserIdAndTaskId(userId, taskId)).once();
        }

        const result = await usecase.getTask(userId, taskId);
        expect(result).toEqual(mockReturn);

        verify(repo.getTaskByUserIdAndTaskId(userId, taskId)).once();
        expect(expectError).toBeUndefined();
      });
    });
  });

  describe("createTask", () => {
    type CreateTaskTestCase = {
      name: string;
      userId: UserId;
      inputParams: { title: string; startDate?: string; dueDate?: string };
      mockReturn: Task | undefined;
      expectError: boolean;
    };

    const testCases: CreateTaskTestCase[] = [
      {
        name: "success",
        userId: userId1,
        inputParams: { title: "new task" },
        mockReturn: {
          id: taskId1,
          userId: userId1,
          title: "new task",
          doneDate: null,
          memo: null,
          type: "new",
        },
        expectError: false,
      },
      {
        name: "failed / createTask error",
        userId: userId1,
        inputParams: { title: "new task" },
        mockReturn: undefined,
        expectError: true,
      },
    ];

    testCases.forEach(
      ({ name, userId, inputParams, mockReturn, expectError }) => {
        it(`${name}`, async () => {
          if (expectError) {
            when(repo.createTask(anything())).thenReject(new Error());
            await expect(
              usecase.createTask(userId, inputParams),
            ).rejects.toThrow(Error);
            return verify(repo.createTask(anything())).once();
          }

          when(repo.createTask(anything())).thenResolve(mockReturn!);

          const result = await usecase.createTask(userId, inputParams);

          expect(result).toEqual(mockReturn);
          verify(repo.createTask(anything())).once();
        });
      },
    );

    it("failed / dueDate before startDate", async () => {
      await expect(
        usecase.createTask(userId1, {
          title: "new task",
          startDate: "2021-01-10",
          dueDate: "2021-01-09",
        }),
      ).rejects.toThrow("dueDate must be on or after startDate");

      verify(repo.createTask(anything())).never();
    });

    it("failed / activityId does not belong to user", async () => {
      when(
        activityRepo.getActivityByIdAndUserId(userId1, activityId1),
      ).thenResolve(undefined);

      await expect(
        usecase.createTask(userId1, {
          title: "new task",
          activityId: activityId1,
        }),
      ).rejects.toThrow("activityId does not belong to user");

      verify(repo.createTask(anything())).never();
    });

    it("success / owned activityId is kept", async () => {
      when(
        activityRepo.getActivityByIdAndUserId(userId1, activityId1),
      ).thenResolve(makeActivity(activityId1));
      when(repo.createTask(anything())).thenCall((task) => task);

      const result = await usecase.createTask(userId1, {
        title: "new task",
        activityId: activityId1,
      });

      expect(result.activityId).toBe(activityId1);
      expect(result.activityKindId).toBeNull();
      verify(repo.createTask(anything())).once();
    });

    it("failed / activityKindId requires activityId", async () => {
      await expect(
        usecase.createTask(userId1, {
          title: "new task",
          activityKindId: activityKindId1,
        }),
      ).rejects.toThrow("activityKindId requires activityId");

      verify(repo.createTask(anything())).never();
    });

    it("failed / activityKindId does not belong to activity", async () => {
      when(
        activityRepo.getActivityByIdAndUserId(userId1, activityId1),
      ).thenResolve(makeActivity(activityId1));

      await expect(
        usecase.createTask(userId1, {
          title: "new task",
          activityId: activityId1,
          activityKindId: activityKindId1,
        }),
      ).rejects.toThrow("activityKindId does not belong to activity");

      verify(repo.createTask(anything())).never();
    });

    it("success / activityKindId belongs to activity", async () => {
      when(
        activityRepo.getActivityByIdAndUserId(userId1, activityId1),
      ).thenResolve(makeActivity(activityId1, [activityKindId1]));
      when(repo.createTask(anything())).thenCall((task) => task);

      const result = await usecase.createTask(userId1, {
        title: "new task",
        activityId: activityId1,
        activityKindId: activityKindId1,
      });

      expect(result.activityId).toBe(activityId1);
      expect(result.activityKindId).toBe(activityKindId1);
      verify(repo.createTask(anything())).once();
    });
  });

  describe("updateTask", () => {
    type UpdateTaskTestCase = {
      name: string;
      userId: UserId;
      taskId: TaskId;
      existingTask: Task | undefined;
      updateParams: {
        title?: string;
        doneDate?: string | null;
        memo?: string | null;
        startDate?: string;
        dueDate?: string | null;
      };
      updatedTask: Task | undefined;
      expectError?: {
        getTask?: Error;
        taskNotFound?: ResourceNotFoundError;
        updateTask?: Error;
      };
    };

    const testCases: UpdateTaskTestCase[] = [
      {
        name: "success",
        userId: userId1,
        taskId: taskId1,
        existingTask: {
          id: taskId1,
          userId: userId1,
          title: "title",
          doneDate: null,
          memo: null,
          dueDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          type: "persisted",
        },
        updateParams: { doneDate: "2021-01-01" },
        updatedTask: {
          id: taskId1,
          userId: userId1,
          title: "title",
          doneDate: "2021-01-01",
          memo: null,
          dueDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          type: "persisted",
        },
      },
      {
        name: "failed / not found",
        userId: userId1,
        taskId: taskId2,
        existingTask: undefined,
        updateParams: { doneDate: "2021-01-01" },
        updatedTask: undefined,
        expectError: {
          taskNotFound: new ResourceNotFoundError("task not found"),
        },
      },
      {
        name: "failed / getTaskByUserIdAndTaskId error",
        userId: userId1,
        taskId: taskId1,
        existingTask: undefined,
        updateParams: { doneDate: "2021-01-01" },
        updatedTask: undefined,
        expectError: {
          getTask: new Error(),
        },
      },
      {
        name: "failed / updateTask error",
        userId: userId1,
        taskId: taskId1,
        existingTask: {
          id: taskId1,
          userId: userId1,
          title: "title",
          doneDate: null,
          memo: null,
          dueDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          type: "persisted",
        },
        updateParams: { doneDate: "2021-01-01" },
        updatedTask: {
          id: taskId1,
          userId: userId1,
          title: "title",
          doneDate: "2021-01-01",
          memo: null,
          dueDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          type: "persisted",
        },
        expectError: {
          updateTask: new Error(),
        },
      },
    ];

    testCases.forEach(
      ({
        name,
        userId,
        taskId,
        existingTask,
        updateParams,
        updatedTask,
        expectError,
      }) => {
        it(`${name}`, async () => {
          if (expectError?.getTask) {
            when(repo.getTaskByUserIdAndTaskId(userId1, taskId1)).thenReject(
              expectError.getTask,
            );
            await expect(
              usecase.updateTask(userId, taskId, updateParams),
            ).rejects.toThrow(Error);
            return verify(repo.getTaskByUserIdAndTaskId(userId, taskId)).once();
          }

          if (expectError?.taskNotFound) {
            when(repo.getTaskByUserIdAndTaskId(userId1, taskId1)).thenResolve(
              existingTask,
            );
            await expect(
              usecase.updateTask(userId, taskId, updateParams),
            ).rejects.toThrow(ResourceNotFoundError);
            return verify(repo.getTaskByUserIdAndTaskId(userId, taskId)).once();
          }

          when(repo.getTaskByUserIdAndTaskId(userId1, taskId1)).thenResolve(
            existingTask,
          );

          if (expectError?.updateTask) {
            when(repo.updateTask(anything())).thenReject(
              expectError.updateTask,
            );
            await expect(
              usecase.updateTask(userId, taskId, updateParams),
            ).rejects.toThrow(Error);

            return verify(repo.updateTask(anything())).once();
          }

          when(repo.updateTask(anything())).thenResolve(updatedTask);

          const result = await usecase.updateTask(userId, taskId, updateParams);
          expect(result).toEqual(updatedTask);

          verify(repo.updateTask(anything())).once();
          expect(expectError).toBeUndefined();
        });
      },
    );

    it("failed / update makes dueDate before startDate", async () => {
      const existingTask: Task = {
        id: taskId1,
        userId: userId1,
        title: "title",
        doneDate: null,
        memo: null,
        startDate: "2021-01-01",
        dueDate: "2021-01-31",
        createdAt: new Date(),
        updatedAt: new Date(),
        type: "persisted",
      };

      when(repo.getTaskByUserIdAndTaskId(userId1, taskId1)).thenResolve(
        existingTask,
      );

      await expect(
        usecase.updateTask(userId1, taskId1, { startDate: "2021-02-01" }),
      ).rejects.toThrow("dueDate must be on or after startDate");

      verify(repo.updateTask(anything())).never();
    });

    it("activityId null clears existing activityKindId", async () => {
      const existingTask: Task = {
        id: taskId1,
        userId: userId1,
        title: "title",
        activityId: activityId1,
        activityKindId: activityKindId1,
        doneDate: null,
        memo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: "persisted",
      };
      when(repo.getTaskByUserIdAndTaskId(userId1, taskId1)).thenResolve(
        existingTask,
      );
      when(repo.updateTask(anything())).thenCall((task) => task);

      const result = await usecase.updateTask(userId1, taskId1, {
        activityId: null,
      });

      expect(result.activityId).toBeNull();
      expect(result.activityKindId).toBeNull();
      verify(repo.updateTask(anything())).once();
    });

    it("activityId change with omitted activityKindId clears old kind", async () => {
      const existingTask: Task = {
        id: taskId1,
        userId: userId1,
        title: "title",
        activityId: activityId1,
        activityKindId: activityKindId1,
        doneDate: null,
        memo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: "persisted",
      };
      when(repo.getTaskByUserIdAndTaskId(userId1, taskId1)).thenResolve(
        existingTask,
      );
      when(
        activityRepo.getActivityByIdAndUserId(userId1, activityId2),
      ).thenResolve(makeActivity(activityId2));
      when(repo.updateTask(anything())).thenCall((task) => task);

      const result = await usecase.updateTask(userId1, taskId1, {
        activityId: activityId2,
      });

      expect(result.activityId).toBe(activityId2);
      expect(result.activityKindId).toBeNull();
      verify(repo.updateTask(anything())).once();
    });

    it("activityKindId can be set when it belongs to current activity", async () => {
      const existingTask: Task = {
        id: taskId1,
        userId: userId1,
        title: "title",
        activityId: activityId1,
        activityKindId: null,
        doneDate: null,
        memo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        type: "persisted",
      };
      when(repo.getTaskByUserIdAndTaskId(userId1, taskId1)).thenResolve(
        existingTask,
      );
      when(
        activityRepo.getActivityByIdAndUserId(userId1, activityId1),
      ).thenResolve(makeActivity(activityId1, [activityKindId1]));
      when(repo.updateTask(anything())).thenCall((task) => task);

      const result = await usecase.updateTask(userId1, taskId1, {
        activityKindId: activityKindId1,
      });

      expect(result.activityId).toBe(activityId1);
      expect(result.activityKindId).toBe(activityKindId1);
      verify(repo.updateTask(anything())).once();
    });

    it("dueDate undefined keeps existing dueDate and dueDate null clears it", async () => {
      const existingTask: Task = {
        id: taskId1,
        userId: userId1,
        title: "title",
        doneDate: null,
        memo: null,
        startDate: "2021-01-01",
        dueDate: "2021-01-31",
        createdAt: new Date(),
        updatedAt: new Date(),
        type: "persisted",
      };
      when(repo.getTaskByUserIdAndTaskId(userId1, taskId1)).thenResolve(
        existingTask,
      );
      when(repo.updateTask(anything())).thenCall((task) => task);

      const kept = await usecase.updateTask(userId1, taskId1, {
        title: "updated",
      });
      const cleared = await usecase.updateTask(userId1, taskId1, {
        dueDate: null,
      });

      expect(kept.dueDate).toBe("2021-01-31");
      expect(cleared.dueDate).toBeNull();
      verify(repo.updateTask(anything())).twice();
    });
  });

  describe("deleteTask", () => {
    type DeleteTaskTestCase = {
      name: string;
      userId: UserId;
      taskId: TaskId;
      existingTask: Task | undefined;
      expectError?: {
        getTask?: Error;
        notFound?: ResourceNotFoundError;
        deleteTask?: Error;
      };
    };

    const testCases: DeleteTaskTestCase[] = [
      {
        name: "success",
        userId: userId1,
        taskId: taskId1,
        existingTask: {
          id: taskId1,
          userId: userId1,
          title: "dummy",
          doneDate: null,
          memo: null,
          type: "new",
        },
      },
      {
        name: "failed / not found",
        userId: userId1,
        taskId: taskId1,
        existingTask: undefined,
        expectError: {
          notFound: new ResourceNotFoundError("task not found"),
        },
      },
      {
        name: "failed / deleteTask error",
        userId: userId1,
        taskId: taskId1,
        existingTask: {
          id: taskId1,
          userId: userId1,
          title: "dummy",
          doneDate: null,
          memo: null,
          type: "new",
        },
        expectError: {
          deleteTask: new Error(),
        },
      },
    ];

    testCases.forEach(({ name, userId, taskId, existingTask, expectError }) => {
      it(`${name}`, async () => {
        if (expectError?.getTask) {
          when(repo.getTaskByUserIdAndTaskId(userId, taskId)).thenReject(
            expectError.getTask,
          );

          await expect(usecase.deleteTask(userId, taskId)).rejects.toThrow(
            Error,
          );
          return verify(repo.getTaskByUserIdAndTaskId(userId, taskId)).once();
        }

        when(repo.getTaskByUserIdAndTaskId(userId, taskId)).thenResolve(
          existingTask,
        );

        if (expectError?.notFound) {
          await expect(usecase.deleteTask(userId, taskId)).rejects.toThrow(
            ResourceNotFoundError,
          );
          return verify(repo.getTaskByUserIdAndTaskId(userId, taskId)).once();
        }

        if (expectError?.deleteTask) {
          when(repo.deleteTask(existingTask!)).thenReject(
            expectError.deleteTask,
          );
          await expect(usecase.deleteTask(userId, taskId)).rejects.toThrow(
            Error,
          );

          return verify(repo.deleteTask(existingTask!)).once();
        }

        await usecase.deleteTask(userId, taskId);

        verify(repo.deleteTask(existingTask!)).once();
        verify(repo.getTaskByUserIdAndTaskId(userId, taskId)).once();
        expect(expectError).toBeUndefined();
      });
    });
  });

  describe("getArchivedTasks", () => {
    type GetArchivedTasksTestCase = {
      name: string;
      userId: UserId;
      mockReturn: Task[] | undefined;
      expectError: boolean;
    };

    const testCases: GetArchivedTasksTestCase[] = [
      {
        name: "success",
        userId: userId1,
        mockReturn: [
          {
            id: taskId1,
            userId: userId1,
            title: "archived task 1",
            doneDate: "2021-01-01",
            memo: null,
            archivedAt: new Date("2021-01-02"),
            type: "persisted",
            createdAt: new Date("2021-01-01"),
            updatedAt: new Date("2021-01-02"),
          },
          {
            id: taskId2,
            userId: userId1,
            title: "archived task 2",
            doneDate: "2021-01-03",
            memo: "test memo",
            archivedAt: new Date("2021-01-04"),
            type: "persisted",
            createdAt: new Date("2021-01-03"),
            updatedAt: new Date("2021-01-04"),
          },
        ],
        expectError: false,
      },
      {
        name: "success / empty result",
        userId: userId1,
        mockReturn: [],
        expectError: false,
      },
      {
        name: "failed / getArchivedTasksByUserId error",
        userId: userId1,
        mockReturn: undefined,
        expectError: true,
      },
    ];

    testCases.forEach(({ name, userId, mockReturn, expectError }) => {
      it(`${name}`, async () => {
        if (expectError) {
          when(repo.getArchivedTasksByUserId(userId)).thenReject(new Error());

          await expect(usecase.getArchivedTasks(userId)).rejects.toThrow(Error);
          return verify(repo.getArchivedTasksByUserId(userId)).once();
        }

        when(repo.getArchivedTasksByUserId(userId)).thenResolve(mockReturn!);

        const result = await usecase.getArchivedTasks(userId);
        expect(result).toEqual(mockReturn);

        verify(repo.getArchivedTasksByUserId(userId)).once();
      });
    });
  });

  describe("archiveTask", () => {
    type ArchiveTaskTestCase = {
      name: string;
      userId: UserId;
      taskId: TaskId;
      mockReturn: Task | undefined;
      expectError?: {
        archiveTask?: Error;
        notFound?: ResourceNotFoundError;
      };
    };

    const testCases: ArchiveTaskTestCase[] = [
      {
        name: "success",
        userId: userId1,
        taskId: taskId1,
        mockReturn: {
          id: taskId1,
          userId: userId1,
          title: "archived task",
          doneDate: "2021-01-01",
          memo: null,
          archivedAt: new Date("2021-01-02"),
          type: "persisted",
          createdAt: new Date("2021-01-01"),
          updatedAt: new Date("2021-01-02"),
        },
      },
      {
        name: "failed / task not found",
        userId: userId1,
        taskId: taskId1,
        mockReturn: undefined,
        expectError: {
          notFound: new ResourceNotFoundError("task not found"),
        },
      },
      {
        name: "failed / archiveTask error",
        userId: userId1,
        taskId: taskId1,
        mockReturn: undefined,
        expectError: {
          archiveTask: new Error(),
        },
      },
    ];

    testCases.forEach(({ name, userId, taskId, mockReturn, expectError }) => {
      it(`${name}`, async () => {
        if (expectError?.archiveTask) {
          when(repo.archiveTask(userId, taskId)).thenReject(
            expectError.archiveTask,
          );

          await expect(usecase.archiveTask(userId, taskId)).rejects.toThrow(
            Error,
          );
          return verify(repo.archiveTask(userId, taskId)).once();
        }

        when(repo.archiveTask(userId, taskId)).thenResolve(mockReturn);

        if (expectError?.notFound) {
          await expect(usecase.archiveTask(userId, taskId)).rejects.toThrow(
            ResourceNotFoundError,
          );
          return verify(repo.archiveTask(userId, taskId)).once();
        }

        const result = await usecase.archiveTask(userId, taskId);
        expect(result).toEqual(mockReturn);

        verify(repo.archiveTask(userId, taskId)).once();
        expect(expectError).toBeUndefined();
      });
    });
  });
});
