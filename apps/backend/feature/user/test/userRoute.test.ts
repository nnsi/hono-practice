import { testClient } from "hono/testing";

import { testDB } from "@backend/setup.test";
import { expect, test } from "vitest";

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

  expect(res.status).toEqual(200);
});

// /meへのテストはauthRoute.test.tsにあるので省略
