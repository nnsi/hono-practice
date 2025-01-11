import { Hono } from "hono";
import { testClient } from "hono/testing";

import { expect, test } from "vitest";

import type { AppContext } from "@/backend/context";
import { TEST_USER_ID, testDB } from "@/backend/test.setup";

import { createAuthRoute } from "..";
import { createUserRoute } from "../../user";

test("POST login / success -> getMe", async () => {
  const app = new Hono<AppContext>();
  app.use("*", async (c, next) => {
    c.set("db", testDB);
    return next();
  });

  const route = app.route("/auth", createAuthRoute());

  const client = testClient(route, {
    JWT_SECRET: "test",
    NODE_ENV: "test",
  });

  const res = await client.auth.login.$post({
    json: {
      login_id: "test-user",
      password: "password",
    },
  });

  expect(res.status).toEqual(200);

  const authCookie = res.headers.get("set-cookie");
  const userRoute = createUserRoute(testDB);

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
    },
  );
  const json = await userRes.json();

  expect(json).toEqual({
    id: TEST_USER_ID,
    name: "test",
  });
});

test("logout / success", async () => {
  const route = createAuthRoute();
  const client = testClient(route);

  const res = await client.logout.$get();

  expect(res.status).toEqual(200);
});
