import { expect, test } from "vitest";

import { createUserId } from "../user";

import { TaskSchema } from "./task";
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
