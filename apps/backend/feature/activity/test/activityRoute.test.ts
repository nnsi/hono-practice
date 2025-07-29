import { Hono } from "hono";
import { testClient } from "hono/testing";


import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import sharp from "sharp";
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

  // Create test image file using sharp
  const testImageBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();

  const file = new File([testImageBuffer], "test-icon.jpg", {
    type: "image/jpeg",
  });
  const formData = new FormData();
  formData.append("file", file);

  const res = await app.request(
    "/00000000-0000-4000-8000-000000000001/icon",
    {
      method: "POST",
      body: formData,
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

  // Create large file (>5MB)
  const largeContent = "a".repeat(5 * 1024 * 1024 + 1);
  const file = new File([largeContent], "large.jpg", { type: "image/jpeg" });
  const formData = new FormData();
  formData.append("file", file);

  const res = await app.request(
    "/00000000-0000-4000-8000-000000000001/icon",
    {
      method: "POST",
      body: formData,
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

  expect(res.status).toEqual(400);
  const resText = await res.text();
  expect(resText).toContain("File size exceeds 5MB limit");
});

test("POST activities/:id/icon / invalid file type", async () => {
  const route = createActivityRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);

  // Create non-image file
  const file = new File(["test content"], "test.txt", { type: "text/plain" });
  const formData = new FormData();
  formData.append("file", file);

  const res = await app.request(
    "/00000000-0000-4000-8000-000000000001/icon",
    {
      method: "POST",
      body: formData,
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

  expect(res.status).toEqual(400);
  const resText = await res.text();
  expect(resText).toContain("Invalid file type");
});

test("POST activities/:id/icon / activity not found", async () => {
  const route = createActivityRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);

  const testImageBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 0, g: 255, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();

  const file = new File([testImageBuffer], "test-icon.jpg", {
    type: "image/jpeg",
  });
  const formData = new FormData();
  formData.append("file", file);

  const res = await app.request(
    "/99999999-9999-9999-9999-999999999999/icon",
    {
      method: "POST",
      body: formData,
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
  const resText = await res.text();
  expect(resText).toContain("activity not found");
});

test("DELETE activities/:id/icon / success", async () => {
  const route = createActivityRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);

  // First, upload an icon
  const testImageBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 0, g: 255, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();

  const file = new File([testImageBuffer], "test-icon.jpg", {
    type: "image/jpeg",
  });
  const formData = new FormData();
  formData.append("file", file);

  const uploadRes = await app.request(
    "/00000000-0000-4000-8000-000000000001/icon",
    {
      method: "POST",
      body: formData,
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
    "/99999999-9999-9999-9999-999999999999/icon",
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
  const resText = await res.text();
  expect(resText).toContain("activity not found");
});
