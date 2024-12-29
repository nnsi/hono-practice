import { testClient } from "hono/testing";

import { test, expect } from "vitest";

import { TEST_USER_ID, testDB } from "@/backend/test.setup";

import { createAuthRoute } from "..";
import { createUserRoute } from "../../user";

test("POST login / success -> getMe", async () => {
  const route = createAuthRoute(testDB);
  const client = testClient(route);

  const res = await client.login.$post({
    json: {
      login_id: "test-user",
      password: "password",
    },
  });

  expect(res.status).toEqual(200);

  const authCookie = res.headers.get("set-cookie");
  const userRoute = createUserRoute(testDB);

  const userRes = await userRoute.request("/me", {
    headers: {
      cookie: authCookie!,
    },
  });
  const json = await userRes.json();

  expect(json).toEqual({
    id: TEST_USER_ID,
    name: "test",
  });
});

test("logout / success", async () => {
  const route = createAuthRoute(testDB);
  const client = testClient(route);

  const res = await client.logout.$get();

  expect(res.status).toEqual(200);
});
