import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { BASE_URL } from "../helpers/config";

describe("navigation", () => {
  const { getPage } = setupBrowser();

  it("ボトムナビで主要タブを切り替えられる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // /actiko がホーム
    await page.waitForURL(`${BASE_URL}/actiko`, { timeout: 15000 });

    const nav = page.locator("nav");

    // Daily へ
    await nav.locator('a[href="/daily"]').click();
    await page.waitForURL("**/daily", { timeout: 15000 });
    await page.waitForSelector(".date-pill-today", { timeout: 15000 });

    // Stats へ
    await nav.locator('a[href="/stats"]').click();
    await page.waitForURL("**/stats", { timeout: 15000 });

    // Goal へ
    await nav.locator('a[href="/goals"]').click();
    await page.waitForURL("**/goals", { timeout: 15000 });

    // Tasks へ
    await nav.locator('a[href="/tasks"]').click();
    await page.waitForURL("**/tasks", { timeout: 15000 });

    // Home へ戻る
    await nav.locator('a[href="/actiko"]').click();
    await page.waitForURL("**/actiko", { timeout: 15000 });
  });

  it("ハンバーガーメニューからロケールを切り替えられる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // ハンバーガーを開く
    await page.click('button[aria-label="Menu"]');

    // 現在の言語に応じて切替ボタンのラベルが決まる
    // ja 表示中 → "English" ボタン / en 表示中 → "日本語" ボタン
    const toEnBtn = page.locator('button:has-text("English")');
    const toJaBtn = page.locator('button:has-text("日本語")');
    const initialLangIsJa = await toEnBtn.isVisible();
    const toggleBtn = initialLangIsJa ? toEnBtn : toJaBtn;

    await toggleBtn.click();

    // 再度メニューを開くと、ラベルが反対側に切り替わっている
    await page.click('button[aria-label="Menu"]');
    const afterEnBtn = page.locator('button:has-text("English")');
    const afterJaBtn = page.locator('button:has-text("日本語")');

    if (initialLangIsJa) {
      await afterJaBtn.waitFor({ state: "visible", timeout: 15000 });
      expect(await afterEnBtn.isVisible()).toBe(false);
    } else {
      await afterEnBtn.waitFor({ state: "visible", timeout: 15000 });
      expect(await afterJaBtn.isVisible()).toBe(false);
    }
  });

  it("存在しないルートで 404 ページが表示される", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.goto(`${BASE_URL}/this-route-does-not-exist`, {
      waitUntil: "networkidle",
    });

    // NotFoundPage には "404" もしくは "Not Found" 相当の表記がある
    const body = await page.locator("body").innerText();
    expect(body).toMatch(/404|Not Found|見つかりません/);
  });
});
