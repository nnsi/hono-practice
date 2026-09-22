import type { Locator, Page } from "playwright";

/** Actiko グリッドのカード（展開・非展開どちらも） */
export function actikoCard(page: Page, activityName: string): Locator {
  return page
    .locator("[data-activity-card]")
    .filter({ hasText: activityName })
    .first();
}

/** その場で展開中のカード */
export function expandedActikoCard(page: Page, activityName: string): Locator {
  return page
    .locator('[data-activity-card][data-expanded="true"]')
    .filter({ hasText: activityName })
    .first();
}

/**
 * カードをタップしてその場で展開し、記録モードの UI を含む展開済みカードを返す。
 * 初回サーバー sync の Dexie 書き込みで liveQuery が連発し、click が
 * "element was detached" で失敗することがあるため force で一発実行する。
 */
export async function expandActikoCard(
  page: Page,
  activityName: string,
): Promise<Locator> {
  const card = actikoCard(page, activityName);
  await card.waitFor({ state: "visible", timeout: 15000 });
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await card.locator("button").first().click({ force: true, timeout: 15000 });
  const expanded = expandedActikoCard(page, activityName);
  await expanded.waitFor({ state: "visible", timeout: 15000 });
  return expanded;
}

/** 保存後にカードが折りたたまれるのを待つ */
export async function waitForActikoCardCollapsed(
  page: Page,
  activityName: string,
): Promise<void> {
  await expandedActikoCard(page, activityName).waitFor({
    state: "detached",
    timeout: 15000,
  });
}
