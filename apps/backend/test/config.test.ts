import { describe, expect, it } from "vitest";

import { configSchema } from "../config";

const baseValid = {
  APP_URL: "http://localhost:1357",
  JWT_SECRET: "x".repeat(32),
  DATABASE_URL: "postgres://localhost/db",
};

describe("configSchema", () => {
  describe("ADMIN_ALLOWED_EMAILS validation", () => {
    it("空文字は許容（optional 扱い）", () => {
      const r = configSchema.safeParse({
        ...baseValid,
        NODE_ENV: "development",
      });
      expect(r.success).toBe(true);
    });

    it("カンマ区切りの有効な email を許容", () => {
      const r = configSchema.safeParse({
        ...baseValid,
        NODE_ENV: "development",
        ADMIN_ALLOWED_EMAILS: "a@example.com, b@example.com",
      });
      expect(r.success).toBe(true);
    });

    it("不正な email 形式を拒否", () => {
      const r = configSchema.safeParse({
        ...baseValid,
        NODE_ENV: "development",
        ADMIN_ALLOWED_EMAILS: "not-an-email",
      });
      expect(r.success).toBe(false);
    });

    it("カンマ区切りで一部が不正な email も拒否", () => {
      const r = configSchema.safeParse({
        ...baseValid,
        NODE_ENV: "development",
        ADMIN_ALLOWED_EMAILS: "valid@example.com, not-an-email",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("production / stg 必須化", () => {
    it("production で ADMIN_ALLOWED_EMAILS 未設定なら reject", () => {
      const r = configSchema.safeParse({
        ...baseValid,
        NODE_ENV: "production",
        JWT_SECRET_ADMIN: "y".repeat(32),
      });
      expect(r.success).toBe(false);
      if (!r.success) {
        const issues = r.error.issues.map((i) => i.path.join("."));
        expect(issues).toContain("ADMIN_ALLOWED_EMAILS");
      }
    });

    it("production で JWT_SECRET_ADMIN 未設定なら reject", () => {
      const r = configSchema.safeParse({
        ...baseValid,
        NODE_ENV: "production",
        ADMIN_ALLOWED_EMAILS: "admin@example.com",
      });
      expect(r.success).toBe(false);
      if (!r.success) {
        const issues = r.error.issues.map((i) => i.path.join("."));
        expect(issues).toContain("JWT_SECRET_ADMIN");
      }
    });

    it("stg でも両方必須", () => {
      const r = configSchema.safeParse({
        ...baseValid,
        NODE_ENV: "stg",
      });
      expect(r.success).toBe(false);
    });

    it("development では必須化されない", () => {
      const r = configSchema.safeParse({
        ...baseValid,
        NODE_ENV: "development",
      });
      expect(r.success).toBe(true);
    });

    it("production で両方設定されていれば OK", () => {
      const r = configSchema.safeParse({
        ...baseValid,
        NODE_ENV: "production",
        ADMIN_ALLOWED_EMAILS: "admin@example.com",
        JWT_SECRET_ADMIN: "y".repeat(32),
      });
      expect(r.success).toBe(true);
    });
  });
});
