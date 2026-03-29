import { describe, expect, it } from "vitest";
import { isLocalOrigin } from "./isLocalOrigin";

describe("isLocalOrigin", () => {
  describe("許可されるorigin", () => {
    it.each([
      "http://localhost",
      "http://localhost:3000",
      "http://localhost:5176",
      "https://localhost:8443",
      "http://127.0.0.1",
      "http://127.0.0.1:3000",
      "http://192.168.1.1",
      "http://192.168.1.1:8080",
      "http://192.168.0.100:3000",
      "http://10.0.0.1",
      "http://10.0.0.1:5000",
      "http://172.16.0.1",
      "http://172.16.0.1:3000",
      "http://172.31.255.255:9999",
    ])("%s → true", (origin) => {
      expect(isLocalOrigin(origin)).toBe(true);
    });
  });

  describe("拒否されるorigin", () => {
    it.each([
      "http://localhost.evil.domain",
      "http://localhost.evil.domain:3000",
      "http://evil.localhost:3000",
      "http://192.168.1.1.evil.com",
      "http://10.0.0.1.evil.com",
      "http://172.16.0.1.evil.com",
      "http://example.com",
      "http://127.0.0.2",
      "http://172.15.0.1",
      "http://172.32.0.1",
      "ftp://localhost:3000",
      "",
    ])("%s → false", (origin) => {
      expect(isLocalOrigin(origin)).toBe(false);
    });
  });
});
