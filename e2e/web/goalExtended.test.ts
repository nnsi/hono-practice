import type { Page } from "playwright";
import { describe, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { createGoal, navigateToGoals } from "../helpers/goal";

async function expandGoalCard(page: Page, activityName: string) {
  const goalCard = page
    .locator(".rounded-2xl")
    .filter({ hasText: activityName })
    .first();
  await goalCard.waitFor({ state: "visible", timeout: 15000 });
  // ヘッダをクリックして展開（role="button" の最上部要素）
  await goalCard.locator('[role="button"]').first().click();
  return goalCard;
}

describe("goal extended", () => {
  const { getPage } = setupBrowser();

  it("タブで「終了済み」に切り替えられる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToGoals(page);

    // 終了済みタブに切り替え
    await page.click('button:has-text("終了済み")');
    await page.waitForSelector('text="終了済みの目標はありません"', {
      timeout: 15000,
    });

    // アクティブタブに戻す
    await page.click('button:has-text("アクティブ")');
  });

  it("目標カードを展開すると統計詳細が表示される", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToGoals(page);

    await createGoal(page, "E2Eランニング", "3");
    await page.waitForSelector('text="E2Eランニング"', { timeout: 15000 });

    const card = await expandGoalCard(page, "E2Eランニング");

    // 統計カードのラベルが展開後に描画される
    await card
      .locator('text="活動日数"')
      .waitFor({ state: "visible", timeout: 15000 });
    await card
      .locator('text="達成日数"')
      .waitFor({ state: "visible", timeout: 15000 });
    await card
      .locator('text="最大連続日数"')
      .waitFor({ state: "visible", timeout: 15000 });
  });

  it("「今日から」で目標を一時停止して再開できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToGoals(page);

    await createGoal(page, "E2Eランニング", "4");
    await page.waitForSelector('text="E2Eランニング"', { timeout: 15000 });

    const card = await expandGoalCard(page, "E2Eランニング");

    // 一時停止期間管理ブロックが展開内に表示される
    await card
      .locator('text="一時停止期間"')
      .waitFor({ state: "visible", timeout: 15000 });

    // 今日から一時停止
    await card.locator('button:has-text("今日から")').click();

    // 一時停止バッジが出現し、「再開する」ボタンに変わる
    await card
      .locator('button:has-text("再開する")')
      .waitFor({ state: "visible", timeout: 15000 });

    // 一時停止中バッジ（ヘッダ側）
    await card
      .locator('text="一時停止中"')
      .first()
      .waitFor({ state: "visible", timeout: 15000 });

    // 再開
    await card.locator('button:has-text("再開する")').click();

    // 「今日から」ボタンが戻ってくる
    await card
      .locator('button:has-text("今日から")')
      .waitFor({ state: "visible", timeout: 15000 });
  });

  it("インライン編集で日次目標を変更できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToGoals(page);

    await createGoal(page, "E2Eランニング", "12");
    await page.waitForSelector("text=/12km/日/", { timeout: 15000 });

    const card = page
      .locator(".rounded-2xl")
      .filter({ hasText: "E2Eランニング" })
      .filter({ hasText: /12km/ })
      .first();

    // 目標値テキスト（title="クリックで編集"）をクリック
    await card.locator('span[title="クリックで編集"]').click();

    // 入力フィールドに切り替わる。編集中は目標値が input value になり、
    // hasText(/12km/) のカード locator では同じカードを再解決できない。
    const inlineInput = page
      .locator(".rounded-2xl")
      .filter({ hasText: "E2Eランニング" })
      .locator('input[type="number"]')
      .first();
    await inlineInput.waitFor({ state: "visible", timeout: 15000 });
    await inlineInput.fill("21");
    await inlineInput.press("Enter");

    // 新しい値に更新される（フィルタでカードを再取得）
    const updatedCard = page
      .locator(".rounded-2xl")
      .filter({ hasText: "E2Eランニング" })
      .filter({ has: page.locator(":scope :text('21km/日')") })
      .first();
    await updatedCard.waitFor({ state: "visible", timeout: 15000 });
  });
});
