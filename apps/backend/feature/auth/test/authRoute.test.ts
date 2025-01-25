import { testClient } from "hono/testing";

import { testDB } from "@backend/test.setup";
import { expect, test } from "vitest";

import { createAuthRoute } from "..";
import { createUserRoute } from "../../user";

test("POST login / success -> getMe", async () => {
  const route = createAuthRoute();
  const client = testClient(route, {
    JWT_SECRET: "test",
    NODE_ENV: "test",
    DB: testDB,
  });

  const res = await client.login.$post({
    json: {
      login_id: "test-user",
      password: "password",
    },
  });

  expect(res.status).toEqual(200);

  const authCookie = res.headers.get("set-cookie");
  const userRoute = createUserRoute();

  const userRes = await userRoute.request(
    "/me",
    {
      headers: {
        cookie: authCookie!,
      },
    },
    {
      JWT_SECRET: "test",
      NODE_ENV: "test",
      DB: testDB,
    },
  );
  expect(userRes.status).toEqual(204);
});

test("logout / success", async () => {
  const route = createAuthRoute();
  const client = testClient(route, {
    DB: testDB,
  });

  const res = await client.logout.$get();

  expect(res.status).toEqual(200);
});
