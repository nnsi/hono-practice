import { DomainValidateError } from "@backend/error";
import { expect, test } from "vitest";

import { createUserId } from "../user";
import { TaskSchema, createTaskEntity } from "./task";
import { createTaskId } from "./taskId";

test("parse NewTask", async () => {
  const TestData = {
    type: "new",
    id: createTaskId("00000000-0000-4000-8000-000000000001"),
    userId: createUserId("00000000-0000-4000-8000-000000000002"),
    title: "title",
    doneDate: null,
    memo: null,
  };

  const res = TaskSchema.parse(TestData);

  expect(res).toEqual({
    type: "new",
    id: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000002",
    title: "title",
    doneDate: null,
    memo: null,
  });
});

test("parse PersistedTask", async () => {
  const TestData = {
    type: "persisted",
    id: createTaskId("00000000-0000-4000-8000-000000000001"),
    userId: createUserId("00000000-0000-4000-8000-000000000002"),
    title: "title",
    doneDate: "2021-01-01",
    memo: "memo",
    startDate: null,
    dueDate: null,
    createdAt: new Date("2021-01-01"),
    updatedAt: new Date("2021-01-01"),
    foo: "bar",
    baz: "qux",
  };

  const res = TaskSchema.parse(TestData);

  expect(res).toEqual({
    type: "persisted",
    id: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000002",
    title: "title",
    doneDate: "2021-01-01",
    memo: "memo",
    startDate: null,
    dueDate: null,
    createdAt: new Date("2021-01-01"),
    updatedAt: new Date("2021-01-01"),
  });
});

test("parse ArchivedTask", async () => {
  // 正常系：アーカイブ済みかつ完了済みのタスク
  const validArchivedTask = createTaskEntity({
    type: "archived",
    id: createTaskId("00000000-0000-4000-8000-000000000001"),
    userId: createUserId("00000000-0000-4000-8000-000000000002"),
    title: "完了済みタスク",
    doneDate: "2021-01-01",
    archivedAt: new Date("2021-01-02"),
    memo: null,
    createdAt: new Date("2021-01-01"),
    updatedAt: new Date("2021-01-02"),
  });

  expect(validArchivedTask.type).toBe("archived");
  expect(validArchivedTask.archivedAt).toEqual(new Date("2021-01-02"));
  expect(validArchivedTask.doneDate).toBe("2021-01-01");

  // 異常系：archivedタイプだが未完了のタスク
  expect(() => {
    // @ts-expect-error: テスト用に意図的に不正な値を渡している
    createTaskEntity({
      type: "archived",
      id: createTaskId("00000000-0000-4000-8000-000000000003"),
      userId: createUserId("00000000-0000-4000-8000-000000000002"),
      title: "未完了タスク",
      doneDate: null,
      archivedAt: new Date("2021-01-02"),
      memo: null,
      createdAt: new Date("2021-01-01"),
      updatedAt: new Date("2021-01-02"),
    });
  }).toThrow(DomainValidateError);

  // 異常系：archivedタイプだがarchivedAtがない
  expect(() => {
    // @ts-expect-error: テスト用に意図的に不正な値を渡している
    createTaskEntity({
      type: "archived",
      id: createTaskId("00000000-0000-4000-8000-000000000004"),
      userId: createUserId("00000000-0000-4000-8000-000000000002"),
      title: "アーカイブ日なし",
      doneDate: "2021-01-01",
      archivedAt: null,
      memo: null,
      createdAt: new Date("2021-01-01"),
      updatedAt: new Date("2021-01-02"),
    });
  }).toThrow(DomainValidateError);
});
