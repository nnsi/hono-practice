import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { BASE_URL } from "../helpers/config";

describe("auth", () => {
  const { getPage } = setupBrowser();

  it("ログインできる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    expect(await page.locator("nav").isVisible()).toBe(true);
  });

  it("新規登録できる", async () => {
    const page = getPage();
    await page.goto(BASE_URL);

    await page.click('button:has-text("新規登録")');
    await page.fill("#register-loginId", "e2e-register@example.com");
    await page.fill("#register-password", "password123");
    await page.click('button[type="submit"]');

    await page.waitForSelector("nav", { timeout: 15000 });
  });

  it("ログアウトできる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('button[aria-label="メニュー"]');
    await page.click('button:has-text("ログアウト")');

    await page.waitForSelector("#loginId", { timeout: 15000 });
  });
});
