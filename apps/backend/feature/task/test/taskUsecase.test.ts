import {
  type Task,
  type TaskId,
  type UserId,
  createTaskId,
  createUserId,
} from "@backend/domain";
import { ResourceNotFoundError } from "@backend/error";
import { anything, instance, mock, reset, verify, when } from "ts-mockito";
import { beforeEach, describe, expect, it } from "vitest";

import { type TaskRepository, newTaskUsecase } from "..";

describe("TaskUsecase", () => {
  let repo: TaskRepository;
  let usecase: ReturnType<typeof newTaskUsecase>;

  beforeEach(() => {
    repo = mock<TaskRepository>();
    usecase = newTaskUsecase(instance(repo));
    reset(repo);
  });

  const userId1 = createUserId("00000000-0000-4000-8000-000000000000");
  const taskId1 = createTaskId("00000000-0000-4000-8000-000000000001");
  const taskId2 = createTaskId("00000000-0000-4000-8000-000000000002");

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
            done: false,
            memo: null,
            type: "new",
          },
          {
            id: taskId2,
            userId: userId1,
            title: "dummy2",
            done: true,
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
          when(repo.getTasksByUserId(userId)).thenReject(new Error());

          await expect(usecase.getTasks(userId)).rejects.toThrow(Error);
          return verify(repo.getTasksByUserId(userId)).once();
        }

        when(repo.getTasksByUserId(userId)).thenResolve(mockReturn!);

        const result = await usecase.getTasks(userId);
        expect(result).toEqual(mockReturn);

        verify(repo.getTasksByUserId(userId)).once();
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
          done: false,
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
      inputParams: { title: string };
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
          done: false,
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
  });

  describe("updateTask", () => {
    type UpdateTaskTestCase = {
      name: string;
      userId: UserId;
      taskId: TaskId;
      existingTask: Task | undefined;
      updateParams: { title?: string; done?: boolean; memo?: string | null };
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
          done: false,
          memo: null,
          due: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          type: "persisted",
        },
        updateParams: { done: true },
        updatedTask: {
          id: taskId1,
          userId: userId1,
          title: "title",
          done: true,
          memo: null,
          due: null,
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
        updateParams: { done: true },
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
        updateParams: { done: true },
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
          done: false,
          memo: null,
          due: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          type: "persisted",
        },
        updateParams: { done: true },
        updatedTask: {
          id: taskId1,
          userId: userId1,
          title: "title",
          done: true,
          memo: null,
          due: null,
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
          done: false,
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
          done: false,
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
});
