import { expect, test } from "vitest";

import { createUserId } from "../user";

import { TaskSchema } from "./task";
import { createTaskId } from "./taskId";

test("parse NewTask", async () => {
  const TestData = {
    status: "new",
    id: createTaskId("00000000-0000-4000-8000-000000000001"),
    userId: createUserId("00000000-0000-4000-8000-000000000002"),
    title: "title",
    done: false,
    memo: null,
  };

  const res = TaskSchema.safeParse(TestData);

  expect(res.data).toEqual({
    status: "new",
    id: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000002",
    title: "title",
    done: false,
    memo: null,
  });
});

test("parse PersistedTask", async () => {
  const TestData = {
    status: "persisted",
    id: createTaskId("00000000-0000-4000-8000-000000000001"),
    userId: createUserId("00000000-0000-4000-8000-000000000002"),
    title: "title",
    done: true,
    memo: "memo",
    due: null,
    createdAt: new Date("2021-01-01"),
    updatedAt: new Date("2021-01-01"),
    foo: "bar",
    baz: "qux",
  };

  const res = TaskSchema.safeParse(TestData);

  expect(res.data).toEqual({
    status: "persisted",
    id: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000002",
    title: "title",
    done: true,
    memo: "memo",
    due: null,
    createdAt: new Date("2021-01-01"),
    updatedAt: new Date("2021-01-01"),
  });
});
