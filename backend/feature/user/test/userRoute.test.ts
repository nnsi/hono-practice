import { testClient } from "hono/testing";

import { expect, test } from "vitest";

import { testDB } from "@/backend/setup.test";

import { createUserRoute } from "..";

test("POST user / success", async () => {
  const route = createUserRoute();
  const client = testClient(route, {
    JWT_SECRET: "test",
    NODE_ENV: "test",
    DB: testDB,
  });

  const res = await client.index.$post({
    json: {
      loginId: "loginId",
      password: "testtest",
      name: "test",
    },
  });

  expect(res.status).toEqual(204);
});

// /meへのテストはauthRoute.test.tsにあるので省略
