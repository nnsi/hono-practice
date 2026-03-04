import { describe, expect, it } from "vitest";

import { app } from "../../../app";

describe("POST /client-errors", () => {
  it("returns 204 for valid error report", async () => {
    const res = await app.request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: "unhandled_error",
          message: "TypeError: Cannot read properties of undefined",
          stack: "at Component.render (app.tsx:42)",
          platform: "ios",
        }),
      },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:1357",
      },
    );
    expect(res.status).toBe(204);
  });

  it("returns 204 with all optional fields", async () => {
    const res = await app.request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: "component_error",
          message: "Render error",
          stack: "stack trace here",
          userId: "user-123",
          screen: "(tabs)/goals",
          platform: "android",
          appVersion: "1.0.0",
        }),
      },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:1357",
      },
    );
    expect(res.status).toBe(204);
  });

  it("returns 400 for invalid errorType", async () => {
    const res = await app.request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: "invalid_type",
          message: "some error",
          platform: "ios",
        }),
      },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:1357",
      },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when message is missing", async () => {
    const res = await app.request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: "unhandled_error",
          platform: "web",
        }),
      },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:1357",
      },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when message exceeds 1000 characters", async () => {
    const res = await app.request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: "unhandled_error",
          message: "x".repeat(1001),
          platform: "web",
        }),
      },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:1357",
      },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid platform", async () => {
    const res = await app.request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: "unhandled_error",
          message: "error",
          platform: "windows",
        }),
      },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:1357",
      },
    );
    expect(res.status).toBe(400);
  });

  it("accepts request without optional fields", async () => {
    const res = await app.request(
      "/client-errors",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: "network_error",
          message: "Network request failed",
          platform: "web",
        }),
      },
      {
        NODE_ENV: "test",
        APP_URL: "http://localhost:1357",
      },
    );
    expect(res.status).toBe(204);
  });
});
