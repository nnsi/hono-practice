import type { Page } from "playwright";

import { BASE_URL } from "./config";

export async function login(page: Page, loginId: string, password: string) {
  await page.goto(BASE_URL);
  await page.locator("#loginId").waitFor({ state: "visible", timeout: 15000 });
  await page.fill("#loginId", loginId);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForSelector("nav", { timeout: 15000 });
}
