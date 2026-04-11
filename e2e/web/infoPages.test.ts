import { describe, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { BASE_URL } from "../helpers/config";
import { navigateToSettings } from "../helpers/settings";

describe("info pages", () => {
  const { getPage, getContext } = setupBrowser();

  it("settingsからお問い合わせフォームを送信できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    await page.click('a:has-text("お問い合わせ")');
    await page.waitForURL("**/contact", { timeout: 15000 });

    await page.fill("#contact-email", "e2e-contact@example.com");
    await page.selectOption("#contact-category", "other");
    await page.fill(
      "#contact-body",
      "E2E テストからのお問い合わせ送信確認です。",
    );
    await page.click('button[type="submit"]');

    await page.waitForSelector('text="お問い合わせを受け付けました"', {
      timeout: 15000,
    });
  });

  it("settingsからAPI Referenceを開ける", async () => {
    const page = getPage();
    const context = getContext();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    const [apiRefPage] = await Promise.all([
      context.waitForEvent("page"),
      page.click('a:has-text("API Reference")'),
    ]);

    await apiRefPage.waitForURL("**/api-reference", { timeout: 15000 });
    await apiRefPage.waitForSelector('text="Actiko API Reference"', {
      timeout: 15000,
    });
    await apiRefPage.waitForSelector('text="Base URL"', { timeout: 15000 });
    await apiRefPage.waitForSelector(
      'text="Authorization: Bearer YOUR_API_KEY"',
      { timeout: 15000 },
    );

    await apiRefPage.close();
  });

  it("プライバシーポリシーページを直接開いてお問い合わせページへ遷移できる", async () => {
    const page = getPage();
    await page.goto(`${BASE_URL}/privacy`);

    await page.waitForSelector('text="プライバシーポリシー"', {
      timeout: 15000,
    });
    await page.click('a:has-text("/contact")');
    await page.waitForURL("**/contact", { timeout: 15000 });
    await page.waitForSelector('text="お問い合わせ"', { timeout: 15000 });
  });
});
