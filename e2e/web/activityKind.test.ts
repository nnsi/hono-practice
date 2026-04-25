import type { Page } from "playwright";
import { describe, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";

async function openCreateActivityDialog(page: Page) {
  await page.click('button:has-text("追加")');
  await page
    .locator('input[placeholder="アクティビティ名"]')
    .waitFor({ state: "visible", timeout: 15000 });
}

describe("activity kinds", () => {
  const { getPage } = setupBrowser();

  it("種類付きアクティビティを作成して記録時に種類を選べる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // 種類2つ付きのアクティビティを作成
    await openCreateActivityDialog(page);
    await page.fill('input[placeholder="アクティビティ名"]', "種類付活動");
    await page.fill('input[placeholder="回, 分, km など"]', "回");

    // 種類を2つ追加
    await page.click('button:has-text("+ 種類を追加")');
    await page.locator('input[placeholder="種類名"]').first().fill("朝");
    await page.click('button:has-text("+ 種類を追加")');
    await page.locator('input[placeholder="種類名"]').nth(1).fill("夜");

    await page.click('button:has-text("作成")');
    await page.waitForSelector('text="種類付活動"', { timeout: 15000 });

    // 記録ダイアログを開いて種類が選べる
    await page.click('text="種類付活動"');
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });
    const modal = page.locator(".modal-backdrop");
    await modal.locator('button:has-text("朝")').waitFor({ state: "visible" });
    await modal.locator('button:has-text("夜")').waitFor({ state: "visible" });

    // 朝を選んで数量を入力
    await modal.locator('button:has-text("朝")').click();
    await modal.locator('input[type="number"]').fill("5");
    // メモを入れる
    await modal
      .locator('textarea[placeholder="メモを入力..."]')
      .fill("気持ちよかった");
    await modal.locator('button:has-text("記録する")').click();

    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });

    // Daily に遷移してメモ・種類付きで記録されたことを確認
    await page.click('a[href="/daily"]');
    await page.waitForURL("**/daily", { timeout: 15000 });
    const logCard = page
      .locator("button")
      .filter({ hasText: "種類付活動" })
      .filter({ hasText: "5回" });
    await logCard.first().waitFor({ state: "visible", timeout: 15000 });
  });
});
