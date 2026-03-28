import type { Page } from "playwright";

/**
 * 設定ページへ遷移する（ハンバーガーメニュー経由）。
 */
export async function navigateToSettings(page: Page) {
  await page.click('button[aria-label="Menu"]');
  await page.waitForSelector('text="設定"', { timeout: 15000 });
  await page.click('text="設定"');
  await page.waitForURL("**/settings", { timeout: 15000 });
}
