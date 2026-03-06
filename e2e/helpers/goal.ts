import type { Page } from "playwright";

/**
 * /goals ページに遷移する。
 */
export async function navigateToGoals(page: Page) {
  await page.click('a[href="/goals"]');
  await page.waitForURL("**/goals", { timeout: 15000 });
}

/**
 * 目標を作成する。/goals ページにいる前提。
 * ダイアログが閉じるまで待機して戻る。
 */
export async function createGoal(
  page: Page,
  activityName: string,
  dailyTarget: string,
) {
  await page.click('button:has-text("新規目標を追加")');
  await page.waitForSelector('text="新しい目標を作成"', { timeout: 15000 });

  await page.click(`button:has-text("${activityName}")`);

  const modal = page.locator(".modal-backdrop");
  const targetInput = modal.locator('input[type="number"]');
  await targetInput.fill(dailyTarget);

  await page.click('button:has-text("作成")');

  await page.waitForSelector(".modal-backdrop", {
    state: "detached",
    timeout: 15000,
  });
}
