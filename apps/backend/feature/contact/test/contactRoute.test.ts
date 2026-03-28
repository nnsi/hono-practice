import { contacts } from "@infra/drizzle/schema";
import { describe, expect, it } from "vitest";

import { app } from "../../../app";
import { testDB } from "../../../test.setup";

function post(body: Record<string, unknown>) {
  return app.request(
    "/contact",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    {
      NODE_ENV: "test" as const,
      APP_URL: "http://localhost:1357",
      DB: testDB,
    },
  );
}

describe("POST /contact", () => {
  it("returns 201 and saves to DB", async () => {
    const res = await post({
      email: "test@example.com",
      body: "テスト問い合わせ",
    });
    expect(res.status).toBe(201);

    const rows = await testDB.select().from(contacts);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("test@example.com");
    expect(rows[0].body).toBe("テスト問い合わせ");
    expect(rows[0].category).toBeNull();
    expect(rows[0].userId).toBeNull();
    expect(rows[0].ipAddress).toBe("anonymous");
  });

  it("saves category when provided", async () => {
    const res = await post({
      email: "test@example.com",
      category: "bug_report",
      body: "バグ報告です",
    });
    expect(res.status).toBe(201);

    const rows = await testDB.select().from(contacts);
    expect(rows[0].category).toBe("bug_report");
  });

  it("returns 400 for invalid email", async () => {
    const res = await post({
      email: "not-an-email",
      body: "本文",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is missing", async () => {
    const res = await post({
      body: "本文のみ",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is empty", async () => {
    const res = await post({
      email: "test@example.com",
      body: "",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when body exceeds 1000 chars", async () => {
    const res = await post({
      email: "test@example.com",
      body: "x".repeat(1001),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid category", async () => {
    const res = await post({
      email: "test@example.com",
      category: "invalid_category",
      body: "本文",
    });
    expect(res.status).toBe(400);
  });

  it("accepts all valid categories", async () => {
    for (const category of ["bug_report", "account_deletion", "other"]) {
      const res = await post({
        email: "test@example.com",
        category,
        body: `${category}の問い合わせ`,
      });
      expect(res.status).toBe(201);
    }
  });
});
