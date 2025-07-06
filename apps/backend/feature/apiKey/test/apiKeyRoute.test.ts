import { testClient } from "hono/testing";

import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { expect, test } from "vitest";

import { createApiKeyRoute } from "../apiKeyRoute";

test("GET /api-keys - should return list of API keys", async () => {
  const route = createApiKeyRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$get();

  expect(res.status).toEqual(200);
  const resJson = await res.json();
  expect(resJson).toHaveProperty("apiKeys");
  expect(Array.isArray(resJson.apiKeys)).toBe(true);
});

test("POST /api-keys - should create a new API key", async () => {
  const route = createApiKeyRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$post({
    json: {
      name: "Test API Key",
    },
  });

  expect(res.status).toEqual(200);
  const resJson = await res.json();
  expect(resJson).toHaveProperty("apiKey");
  expect(resJson.apiKey).toHaveProperty("id");
  expect(resJson.apiKey).toHaveProperty("key");
  expect(resJson.apiKey.name).toEqual("Test API Key");
  expect(resJson.apiKey.isActive).toBe(true);
});

test("DELETE /api-keys/:id - should delete an API key", async () => {
  const route = createApiKeyRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  // First create an API key
  const createRes = await client.index.$post({
    json: {
      name: "API Key to Delete",
    },
  });
  const { apiKey } = await createRes.json();

  // Then delete it
  const res = await client[":id"].$delete({
    param: {
      id: apiKey.id,
    },
  });

  expect(res.status).toEqual(200);
  const resJson = await res.json();
  expect(resJson).toHaveProperty("success");
  expect(resJson.success).toBe(true);
});

test("POST /api-keys - should validate name field", async () => {
  const route = createApiKeyRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$post({
    json: {
      name: "", // 空の名前
    },
  });

  expect(res.status).toEqual(400);
});

test("DELETE /api-keys/:id - should return 404 for non-existent API key", async () => {
  const route = createApiKeyRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client[":id"].$delete({
    param: {
      id: "00000000-0000-4000-8000-999999999999", // 存在しないID
    },
  });

  expect(res.status).toEqual(404); // ResourceNotFoundErrorは404を返す
});
