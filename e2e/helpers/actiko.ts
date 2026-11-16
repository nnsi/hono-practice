import type { Locator, Page } from "playwright";

// /actiko は「記録グリッド」「この日の記録」「タスク」の 3 節を 1 画面に持ち、
// 「追加」ボタンが複数ある。節でスコープして取り違えを防ぐ。

function sectionByHeading(page: Page, heading: string): Locator {
  return page.locator("main > section").filter({
    has: page.getByRole("heading", { name: heading, exact: true }),
  });
}

/** 記録グリッドの節（見出しを持たない唯一の節） */
export function activityGridSection(page: Page): Locator {
  return page
    .locator("main > section")
    .filter({ hasNot: page.getByRole("heading") });
}

/** 「この日の記録」節 */
export function recordsSection(page: Page): Locator {
  return sectionByHeading(page, "この日の記録");
}

/** 「タスク」節 */
export function tasksSection(page: Page): Locator {
  return sectionByHeading(page, "タスク");
}

/** グリッド上のアクティビティカード（タップで記録ダイアログを開くボタン） */
export function activityCard(page: Page, activityName: string): Locator {
  return activityGridSection(page)
    .getByRole("button")
    .filter({ hasText: activityName });
}

/** 「この日の記録」の行。quantityText は "7km" のような整形済み表記 */
export function logRow(
  page: Page,
  activityName: string,
  quantityText: string,
): Locator {
  return recordsSection(page)
    .getByRole("button")
    .filter({ hasText: activityName })
    .filter({ hasText: quantityText });
}

/** グリッド下の「追加」からアクティビティ作成ダイアログを開く */
export async function openCreateActivityDialog(page: Page) {
  await activityGridSection(page)
    .getByRole("button", { name: "追加", exact: true })
    .click();
  await page
    .locator('input[placeholder="アクティビティ名"]')
    .waitFor({ state: "visible", timeout: 15000 });
}

/** アクティビティを作成し、グリッドにカードが出るまで待つ */
export async function createActivity(page: Page, name: string, unit: string) {
  await openCreateActivityDialog(page);
  await page.fill('input[placeholder="アクティビティ名"]', name);
  await page.fill('input[placeholder="回, 分, km など"]', unit);
  await page.click('.modal-backdrop button:has-text("作成")');
  await activityCard(page, name).waitFor({ state: "visible", timeout: 15000 });
}

/** カードをタップして手動入力モードで数量を記録する */
export async function recordQuantity(
  page: Page,
  activityName: string,
  quantity: string,
) {
  const card = activityCard(page, activityName);
  await card.waitFor({ state: "visible", timeout: 15000 });
  // 初回サーバー sync の Dexie 書き込みで liveQuery が連発し、click が
  // "element was detached" で失敗する。force でアクション可能性チェックを
  // 飛ばし、retry なしで一発で実行する。
  await card.click({ force: true, timeout: 15000 });
  await page.waitForSelector(".modal-backdrop", { timeout: 15000 });

  const modal = page.locator(".modal-backdrop");
  await modal.locator('input[type="number"]').fill(quantity);
  await modal.locator('button:has-text("記録する")').click();

  await page.waitForSelector(".modal-backdrop", {
    state: "detached",
    timeout: 15000,
  });
}
