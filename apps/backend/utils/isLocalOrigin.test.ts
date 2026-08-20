import { describe, expect, it } from "vitest";

import { isLocalHost, isLocalOrigin } from "./isLocalOrigin";

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

describe("isLocalHost", () => {
  describe("許可される host", () => {
    it.each([
      "localhost",
      "localhost:3000",
      "127.0.0.1",
      "127.0.0.1:8787",
      "192.168.1.1",
      "192.168.1.10:8787",
      "10.0.0.1",
      "172.16.0.1",
      "172.31.255.255:9999",
    ])("%s → true", (host) => {
      expect(isLocalHost(host)).toBe(true);
    });
  });

  describe("拒否される host", () => {
    it.each([
      "localhost.evil.com",
      "evil.localhost",
      "192.168.1.1.evil.com",
      "192.168.1",
      "172.15.0.1",
      "172.32.0.1",
      "example.com",
      "",
    ])("%s → false", (host) => {
      expect(isLocalHost(host)).toBe(false);
    });
  });
});
