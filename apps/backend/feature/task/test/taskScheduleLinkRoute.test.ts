import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { taskSchedules, tasks } from "@infra/drizzle/schema";
import { createUserId } from "@packages/domain/user/userSchema";
import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";

import {
  request,
  seedOtherUser,
  seedSchedule,
} from "../../taskSchedule/test/helpers";
import { getTaskChangesAfter } from "../taskChangesRepository";
import { hardDeleteTasksByUserId } from "../taskWriteRepository";

describe("Task schedule fields", () => {
  test("CRUD, archive and legacy changes retain schedule fields", async () => {
    const schedule = await seedSchedule();
    const fields = { scheduleId: schedule.id, scheduledDate: "2026-09-10" };
    const createdRes = await request("POST", "/users/tasks", {
      title: "予定",
      startDate: "2026-09-10",
      ...fields,
    });
    expect(createdRes.status).toBe(201);
    const task = await createdRes.json();
    expect(task).toMatchObject(fields);
    const path = `/users/tasks/${task.id}`;
    expect(await (await request("GET", path)).json()).toMatchObject(fields);
    expect(
      await (await request("PUT", path, { doneDate: "2026-09-10" })).json(),
    ).toMatchObject(fields);
    const changes = await getTaskChangesAfter(testDB)(
      createUserId(TEST_USER_ID),
      new Date(0),
    );
    expect(changes.tasks.find((row) => row.id === task.id)).toMatchObject(
      fields,
    );
    expect((await request("POST", `${path}/archive`)).status).toBe(200);
    const archived = await getTaskChangesAfter(testDB)(
      createUserId(TEST_USER_ID),
      new Date(0),
    );
    expect(archived.tasks.find((row) => row.id === task.id)).toMatchObject({
      ...fields,
      type: "archived",
    });
  });
  test("fields can be updated and cleared; absent fields remain compatible", async () => {
    const schedule = await seedSchedule();
    const path = "/users/tasks/00000000-0000-4000-8000-000000000001";
    const fields = { scheduleId: schedule.id, scheduledDate: "2026-09-11" };
    expect(await (await request("PUT", path, fields)).json()).toMatchObject(
      fields,
    );
    expect(
      await (await request("PUT", path, { title: "保持" })).json(),
    ).toMatchObject(fields);
    expect(
      await (
        await request("PUT", path, { scheduleId: null, scheduledDate: null })
      ).json(),
    ).toMatchObject({ scheduleId: null, scheduledDate: null });
    expect(
      (
        await request("POST", "/users/tasks", {
          title: "通常",
          startDate: "2026-09-10",
        })
      ).status,
    ).toBe(201);
  });
  test("foreign or missing schedule references are rejected", async () => {
    const other = await seedOtherUser();
    for (const scheduleId of [other.scheduleId, crypto.randomUUID()]) {
      expect(
        (
          await request("POST", "/users/tasks", {
            title: "不可",
            startDate: "2026-09-10",
            scheduleId,
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await request(
            "PUT",
            "/users/tasks/00000000-0000-4000-8000-000000000001",
            { scheduleId },
          )
        ).status,
      ).toBe(400);
    }
  });
  test("account hard delete removes schedules after their tasks", async () => {
    const schedule = await seedSchedule();
    await testDB
      .insert(tasks)
      .values({ userId: TEST_USER_ID, title: "予定", scheduleId: schedule.id });
    expect(
      await hardDeleteTasksByUserId(testDB)(createUserId(TEST_USER_ID)),
    ).toBe(3);
    expect(
      await testDB.query.taskSchedules.findFirst({
        where: eq(taskSchedules.userId, TEST_USER_ID),
      }),
    ).toBeUndefined();
  });
});
