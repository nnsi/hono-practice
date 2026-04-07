import { testClient } from "hono/testing";

import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { activities, notes } from "@infra/drizzle/schema";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { createNoteRoute } from "..";

function createClient() {
  const route = createNoteRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  return testClient(app, { DB: testDB });
}

beforeEach(async () => {
  await testDB.delete(notes).where(eq(notes.userId, TEST_USER_ID));
});

describe("noteRoute", () => {
  it("GET / returns empty array when no notes exist", async () => {
    const client = createClient();
    const res = await client.index.$get({ query: {} });
    expect(res.status).toEqual(200);

    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("POST / creates a note with title and content", async () => {
    const client = createClient();
    const res = await client.index.$post({
      json: {
        title: "Test Note",
        content: "Test Content",
      },
    });
    expect(res.status).toEqual(200);

    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.title).toEqual("Test Note");
    expect(body.content).toEqual("Test Content");
    expect(body.activityId).toBeNull();
    expect(body.createdAt).toBeDefined();
    expect(body.updatedAt).toBeDefined();
  });

  it("POST / creates a note with activityId", async () => {
    const client = createClient();
    const [activity] = await testDB
      .insert(activities)
      .values({
        userId: TEST_USER_ID,
        name: "Test Activity",
      })
      .returning();

    const res = await client.index.$post({
      json: {
        title: "Note with Activity",
        content: "Content",
        activityId: activity.id,
      },
    });
    expect(res.status).toEqual(200);

    const body = await res.json();
    expect(body.activityId).toEqual(activity.id);
  });

  it("POST / with non-owned activityId returns 400", async () => {
    const client = createClient();
    const res = await client.index.$post({
      json: {
        title: "Bad Activity",
        content: "",
        activityId: "00000000-0000-4000-8000-999999999999",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("PUT /:id with non-owned activityId returns 400", async () => {
    const client = createClient();
    const createRes = await client.index.$post({
      json: { title: "Original", content: "Body" },
    });
    const created = await createRes.json();

    const res = await client[":id"].$put({
      param: { id: created.id },
      json: {
        activityId: "00000000-0000-4000-8000-999999999999",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("GET /:id returns a created note", async () => {
    const client = createClient();
    const createRes = await client.index.$post({
      json: { title: "Fetch Me", content: "Body" },
    });
    const created = await createRes.json();

    const res = await client[":id"].$get({
      param: { id: created.id },
    });
    expect(res.status).toEqual(200);

    const body = await res.json();
    expect(body.id).toEqual(created.id);
    expect(body.title).toEqual("Fetch Me");
    expect(body.content).toEqual("Body");
  });

  it("GET / includes created notes in the list", async () => {
    const client = createClient();
    await client.index.$post({
      json: { title: "Note A", content: "" },
    });
    await client.index.$post({
      json: { title: "Note B", content: "" },
    });

    const res = await client.index.$get({ query: {} });
    expect(res.status).toEqual(200);

    const body = await res.json();
    expect(body.length).toEqual(2);
  });

  it("GET /?activityId=xxx filters by activityId", async () => {
    const client = createClient();
    const [activity] = await testDB
      .insert(activities)
      .values({
        userId: TEST_USER_ID,
        name: "Filter Activity",
      })
      .returning();

    await client.index.$post({
      json: { title: "With Activity", activityId: activity.id },
    });
    await client.index.$post({
      json: { title: "Without Activity" },
    });

    const res = await client.index.$get({
      query: { activityId: activity.id },
    });
    expect(res.status).toEqual(200);

    const body = await res.json();
    expect(body.length).toEqual(1);
    expect(body[0].title).toEqual("With Activity");
  });

  it("PUT /:id updates title and content", async () => {
    const client = createClient();
    const createRes = await client.index.$post({
      json: { title: "Original", content: "Old" },
    });
    const created = await createRes.json();

    const res = await client[":id"].$put({
      param: { id: created.id },
      json: { title: "Updated", content: "New" },
    });
    expect(res.status).toEqual(200);

    const body = await res.json();
    expect(body.title).toEqual("Updated");
    expect(body.content).toEqual("New");
  });

  it("DELETE /:id soft deletes a note", async () => {
    const client = createClient();
    const createRes = await client.index.$post({
      json: { title: "To Delete", content: "" },
    });
    const created = await createRes.json();

    const deleteRes = await client[":id"].$delete({
      param: { id: created.id },
    });
    expect(deleteRes.status).toEqual(200);

    const listRes = await client.index.$get({ query: {} });
    const list = await listRes.json();
    expect(list.length).toEqual(0);
  });

  it("GET /:id returns 404 after soft delete", async () => {
    const client = createClient();
    const createRes = await client.index.$post({
      json: { title: "Gone", content: "" },
    });
    const created = await createRes.json();

    await client[":id"].$delete({
      param: { id: created.id },
    });

    const res = await client[":id"].$get({
      param: { id: created.id },
    });
    expect(res.status).toEqual(404);
  });

  it("POST / without title returns 400", async () => {
    const client = createClient();
    const res = await client.index.$post({
      json: { title: "", content: "No title" },
    });
    expect(res.status).toEqual(400);
  });
});
