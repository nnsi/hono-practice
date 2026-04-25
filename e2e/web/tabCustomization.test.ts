import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { navigateToSettings } from "../helpers/settings";

// TabCustomizationSection の各行は
// <div className="flex items-center gap-3 rounded-xl border ..."> で描画される。
// 表示中: border のみ / 非表示: border-dashed
const TAB_ROW_SELECTOR = "div.flex.rounded-xl.border";

describe("tab customization", () => {
  const { getPage } = setupBrowser();

  it("デフォルト表示タブをメニューへ移動/再表示できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    await page.waitForSelector('text="タブカスタマイズ"', { timeout: 15000 });

    // Tasks タブはデフォルトで表示中 → 「メニューへ移動」で非表示化
    const tasksRow = page
      .locator(TAB_ROW_SELECTOR)
      .filter({ hasText: "Tasks" })
      .first();
    await tasksRow.waitFor({ state: "visible", timeout: 15000 });
    await tasksRow.locator('button:has-text("メニューへ移動")').click();

    // 破線枠（メニューのみ）に切り替わる
    const hiddenTasksRow = page
      .locator(`${TAB_ROW_SELECTOR}.border-dashed`)
      .filter({ hasText: "Tasks" })
      .first();
    await hiddenTasksRow.waitFor({ state: "visible", timeout: 15000 });

    // 「タブに表示」で再表示
    await hiddenTasksRow.locator('button:has-text("タブに表示")').click();

    // 実線枠に戻る
    await expect
      .poll(async () => {
        const rows = page
          .locator(TAB_ROW_SELECTOR)
          .filter({ hasText: "Tasks" });
        const count = await rows.count();
        for (let i = 0; i < count; i++) {
          const cls = (await rows.nth(i).getAttribute("class")) ?? "";
          if (!cls.includes("border-dashed")) return true;
        }
        return false;
      })
      .toBe(true);
  });

  it("隠しタブ Notes はメニューから開ける", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    // Notes はデフォルトでメニュー側に隠されている
    const hiddenNotesRow = page
      .locator(`${TAB_ROW_SELECTOR}.border-dashed`)
      .filter({ hasText: "Notes" })
      .first();
    await hiddenNotesRow.waitFor({ state: "visible", timeout: 15000 });

    // ハンバーガーから Notes に遷移できる
    await page.click('button[aria-label="Menu"]');
    await page.click('a:has-text("Notes")');
    await page.waitForURL("**/notes", { timeout: 15000 });
  });

  it("Home タブは固定で非表示化できない", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    const homeRow = page
      .locator(TAB_ROW_SELECTOR)
      .filter({ hasText: "Actiko" })
      .first();
    await homeRow.waitFor({ state: "visible", timeout: 15000 });

    await homeRow
      .locator('text="固定"')
      .waitFor({ state: "visible", timeout: 15000 });
    expect(
      await homeRow.locator('button:has-text("メニューへ移動")').count(),
    ).toBe(0);
  });
});
