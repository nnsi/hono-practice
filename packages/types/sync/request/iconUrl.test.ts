import { describe, expect, it } from "vitest";

import { iconUrlSchema, isSafeIconUrl } from "./iconUrl";

describe("iconUrlSchema", () => {
  it.each([
    "https://api.actiko.app/r2/icons/user/activity_1_abc.webp",
    "http://localhost:5173/public/uploads/icons/user/activity.webp",
    "/r2/icons/user/activity.webp",
    "data:image/webp;base64,AAAA",
    "https://example.com/a.png?x=..",
  ])("accepts %s", (value) => {
    expect(isSafeIconUrl(value)).toBe(true);
    expect(iconUrlSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    "http://localhost:3456/public/uploads/icons/../../../.env",
    "/public/uploads/../../.env",
    "https://example.com/..",
    "javascript:alert(1)",
    "file:///etc/passwd",
    "data:text/html;base64,AAAA",
    "icons/user/a.webp",
    "http://localhost/public\\uploads\\a.webp",
    // プロトコル相対はブラウザが外部ホストとして解決する
    "//evil.example/x.png",
    // ブラウザは %2e%2e を .. に正規化する
    "https://api.actiko.app/r2/icons/%2e%2e/%2e%2e/.env",
    "/r2/icons/%2E%2E/x.webp",
  ])("rejects %s", (value) => {
    expect(isSafeIconUrl(value)).toBe(false);
    expect(iconUrlSchema.safeParse(value).success).toBe(false);
  });

  it("accepts null", () => {
    expect(iconUrlSchema.safeParse(null).success).toBe(true);
  });
});
