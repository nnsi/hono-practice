import { describe, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";

/** YYYY年M月 形式の文字列を返す */
function formatMonth(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

describe("stats", () => {
  const { getPage } = setupBrowser();

  it("統計ページを表示できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/stats"]');
    await page.waitForURL("**/stats", { timeout: 15000 });

    // 現在の月が表示される（YYYY年M月）
    const currentMonth = formatMonth(new Date());
    await page.waitForSelector(`text="${currentMonth}"`, { timeout: 15000 });

    // シードデータの「E2Eランニング」の統計カードが表示される
    await page.waitForSelector('text="E2Eランニング"', { timeout: 15000 });
  });

  it("前月に移動できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/stats"]');
    await page.waitForURL("**/stats", { timeout: 15000 });

    const currentMonth = formatMonth(new Date());
    await page.waitForSelector(`text="${currentMonth}"`, { timeout: 15000 });

    // 左矢印ボタンで前月へ（aria-label使用）
    await page.click('button[aria-label="前の月"]');

    const prev = new Date();
    prev.setMonth(prev.getMonth() - 1);
    const prevMonth = formatMonth(prev);
    await page.waitForSelector(`text="${prevMonth}"`, { timeout: 15000 });
  });

  it("翌月に戻れる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/stats"]');
    await page.waitForURL("**/stats", { timeout: 15000 });

    // 前月へ移動
    await page.click('button[aria-label="前の月"]');
    const prev = new Date();
    prev.setMonth(prev.getMonth() - 1);
    const prevMonth = formatMonth(prev);
    await page.waitForSelector(`text="${prevMonth}"`, { timeout: 15000 });

    // 右矢印ボタンで翌月（当月）へ戻る
    await page.click('button[aria-label="次の月"]');
    const currentMonth = formatMonth(new Date());
    await page.waitForSelector(`text="${currentMonth}"`, { timeout: 15000 });
  });
});
