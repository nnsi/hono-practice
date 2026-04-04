import { describe, expect, it } from "vitest";

import { toOIDCPayload } from "../oauthVerify";

const basePayload = {
  iss: "https://accounts.google.com",
  sub: "1234567890",
  aud: "my-client-id",
  exp: 1700000000,
  iat: 1699999000,
};

describe("toOIDCPayload", () => {
  describe("正常系", () => {
    it("全フィールドが揃った場合に正しく変換できる", () => {
      const payload = {
        ...basePayload,
        email: "user@example.com",
        email_verified: true,
        name: "Test User",
        picture: "https://example.com/photo.jpg",
      };

      const result = toOIDCPayload(payload);

      expect(result).toEqual({
        iss: "https://accounts.google.com",
        sub: "1234567890",
        aud: "my-client-id",
        exp: 1700000000,
        iat: 1699999000,
        email: "user@example.com",
        email_verified: true,
        name: "Test User",
        picture: "https://example.com/photo.jpg",
      });
    });

    it("aud が配列の場合に先頭要素を採用する", () => {
      const payload = {
        ...basePayload,
        aud: ["first-client-id", "second-client-id"],
      };

      const result = toOIDCPayload(payload);

      expect(result.aud).toBe("first-client-id");
    });

    it("オプショナルフィールドが省略された場合は undefined になる", () => {
      const result = toOIDCPayload(basePayload);

      expect(result.email).toBeUndefined();
      expect(result.email_verified).toBeUndefined();
      expect(result.name).toBeUndefined();
      expect(result.picture).toBeUndefined();
    });

    it("email が文字列以外（number）の場合は undefined になる", () => {
      const payload = {
        ...basePayload,
        email: 12345 as unknown as string,
        email_verified: "yes" as unknown as boolean,
        name: 42 as unknown as string,
        picture: true as unknown as string,
      };

      const result = toOIDCPayload(payload);

      expect(result.email).toBeUndefined();
      expect(result.email_verified).toBeUndefined();
      expect(result.name).toBeUndefined();
      expect(result.picture).toBeUndefined();
    });
  });

  describe("異常系", () => {
    it("iss が欠損している場合は throw する", () => {
      const payload = { ...basePayload, iss: undefined };

      expect(() => toOIDCPayload(payload)).toThrow(
        "Invalid OIDC payload: missing required claims",
      );
    });

    it("sub が欠損している場合は throw する", () => {
      const payload = { ...basePayload, sub: undefined };

      expect(() => toOIDCPayload(payload)).toThrow(
        "Invalid OIDC payload: missing required claims",
      );
    });

    it("aud が欠損している場合は throw する", () => {
      const payload = { ...basePayload, aud: undefined };

      expect(() => toOIDCPayload(payload)).toThrow(
        "Invalid OIDC payload: missing required claims",
      );
    });

    it("exp が欠損している場合は throw する", () => {
      const payload = { ...basePayload, exp: undefined };

      expect(() => toOIDCPayload(payload)).toThrow(
        "Invalid OIDC payload: missing required claims",
      );
    });

    it("iat が欠損している場合は throw する", () => {
      const payload = { ...basePayload, iat: undefined };

      expect(() => toOIDCPayload(payload)).toThrow(
        "Invalid OIDC payload: missing required claims",
      );
    });
  });
});
