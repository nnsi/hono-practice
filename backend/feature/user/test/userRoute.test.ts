import { testClient } from "hono/testing";

import { expect, test } from "vitest";

import { testDB } from "@/backend/test.setup";

import { createUserRoute } from "..";

test("POST user / success", async () => {
  const route = createUserRoute(testDB);
  const client = testClient(route);

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
