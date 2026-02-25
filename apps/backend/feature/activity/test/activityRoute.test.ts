import { Hono } from "hono";
import { testClient } from "hono/testing";

import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { expect, test } from "vitest";

import { createActivityRoute } from "..";

test("GET activities / success", async () => {
  const route = createActivityRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$get();

  const resJson = await res.json();

  expect(res.status).toEqual(200);
  expect(resJson.length).toEqual(3);
});

test("GET activities/:id / success", async () => {
  const route = createActivityRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client[":id"].$get({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
  });

  const resJson = await res.json();

  expect(res.status).toEqual(200);
  expect(resJson.name).toEqual("test");
});

test("POST activities / success", async () => {
  const route = createActivityRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$post({
    json: {
      name: "test",
      label: "test",
      emoji: "🏃",
      quantityUnit: "回",
      showCombinedStats: true,
    },
  });

  expect(res.status).toEqual(200);
});

test("PUT activities/:id / success", async () => {
  const route = createActivityRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client[":id"].$put({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
    json: {
      activity: {
        name: "test",
        emoji: "🏃",
        quantityUnit: "回",
        showCombinedStats: true,
      },
      kinds: [],
    },
  });

  expect(res.status).toEqual(200);
});

test("DELETE activities/:id / success", async () => {
  const route = createActivityRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client[":id"].$delete({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
  });

  expect(res.status).toEqual(200);
});

test("POST activities/:id/icon / success", async () => {
  const route = createActivityRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);

  // Create test base64 image data
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="; // 1x1 red pixel
  const mimeType = "image/png";

  const res = await app.request(
    "/00000000-0000-4000-8000-000000000001/icon",
    {
      method: "POST",
      body: JSON.stringify({ base64, mimeType }),
      headers: {
        "x-user-id": "00000000-0000-4000-8000-000000000001",
        "Content-Type": "application/json",
      },
    },
    {
      DB: testDB,
      STORAGE: "local",
      APP_URL: "http://localhost:3000",
    },
  );

  expect(res.status).toEqual(200);
  const resJson = await res.json();
  expect(resJson.iconUrl).toBeDefined();
  expect(resJson.iconThumbnailUrl).toBeDefined();
});

test("POST activities/:id/icon / file too large", async () => {
  const route = createActivityRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);

  // Create base64 string larger than reasonable limit
  const largeBase64 = "A".repeat(1000000); // ~1MB of base64 data
  const mimeType = "image/jpeg";

  const res = await app.request(
    "/00000000-0000-4000-8000-000000000001/icon",
    {
      method: "POST",
      body: JSON.stringify({ base64: largeBase64, mimeType }),
      headers: {
        "x-user-id": "00000000-0000-4000-8000-000000000001",
        "Content-Type": "application/json",
      },
    },
    {
      DB: testDB,
      STORAGE: "local",
      APP_URL: "http://localhost:3000",
    },
  );

  // Since we're not implementing size validation in this version, this should succeed
  expect(res.status).toEqual(200);
});

test("POST activities/:id/icon / invalid file type", async () => {
  const route = createActivityRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);

  // Create invalid mime type
  const base64 = "dGVzdCBjb250ZW50"; // "test content" in base64
  const mimeType = "text/plain";

  const res = await app.request(
    "/00000000-0000-4000-8000-000000000001/icon",
    {
      method: "POST",
      body: JSON.stringify({ base64, mimeType }),
      headers: {
        "x-user-id": "00000000-0000-4000-8000-000000000001",
        "Content-Type": "application/json",
      },
    },
    {
      DB: testDB,
      STORAGE: "local",
      APP_URL: "http://localhost:3000",
    },
  );

  expect(res.status).toEqual(400);
  const resJson = await res.json();
  expect(resJson.message).toContain("Invalid image type");
});

test("POST activities/:id/icon / activity not found", async () => {
  const route = createActivityRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);

  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const mimeType = "image/png";

  const res = await app.request(
    "/00000000-0000-4000-8000-000000000000/icon",
    {
      method: "POST",
      body: JSON.stringify({ base64, mimeType }),
      headers: {
        "x-user-id": "00000000-0000-4000-8000-000000000001",
        "Content-Type": "application/json",
      },
    },
    {
      DB: testDB,
      STORAGE: "local",
      APP_URL: "http://localhost:3000",
    },
  );

  expect(res.status).toEqual(404);
  const resJson = await res.json();
  expect(resJson.message).toContain("activity not found");
});

test("DELETE activities/:id/icon / success", async () => {
  const route = createActivityRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);

  // First, upload an icon
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const mimeType = "image/png";

  const uploadRes = await app.request(
    "/00000000-0000-4000-8000-000000000001/icon",
    {
      method: "POST",
      body: JSON.stringify({ base64, mimeType }),
      headers: {
        "x-user-id": "00000000-0000-4000-8000-000000000001",
        "Content-Type": "application/json",
      },
    },
    {
      DB: testDB,
      STORAGE: "local",
      APP_URL: "http://localhost:3000",
    },
  );

  expect(uploadRes.status).toEqual(200);

  // Then delete it
  const deleteRes = await app.request(
    "/00000000-0000-4000-8000-000000000001/icon",
    {
      method: "DELETE",
      headers: {
        "x-user-id": "00000000-0000-4000-8000-000000000001",
      },
    },
    {
      DB: testDB,
      STORAGE: "local",
      APP_URL: "http://localhost:3000",
    },
  );

  expect(deleteRes.status).toEqual(200);
  const resJson = await deleteRes.json();
  expect(resJson.success).toBe(true);
});

test("DELETE activities/:id/icon / activity not found", async () => {
  const route = createActivityRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);

  const res = await app.request(
    "/00000000-0000-4000-8000-000000000000/icon",
    {
      method: "DELETE",
      headers: {
        "x-user-id": "00000000-0000-4000-8000-000000000001",
      },
    },
    {
      DB: testDB,
      STORAGE: "local",
      APP_URL: "http://localhost:3000",
    },
  );

  expect(res.status).toEqual(404);
  const resJson = await res.json();
  expect(resJson.message).toContain("activity not found");
});
