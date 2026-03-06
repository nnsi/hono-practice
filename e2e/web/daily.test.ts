import { describe, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";

describe("daily", () => {
  const { getPage } = setupBrowser();

  it("記録履歴を確認できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // ホーム（/actiko）でシード済み「E2Eランニング」カードを押下して記録
    await page.waitForSelector('text="E2Eランニング"', { timeout: 15000 });
    await page.click('text="E2Eランニング"');

    // RecordDialog が開く
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });

    // モーダル内の数量入力フィールドに記録
    const modal = page.locator(".modal-backdrop");
    const quantityInput = modal.locator('input[type="number"]');
    await quantityInput.fill("7");
    await page.click('button:has-text("記録する")');

    // ダイアログが閉じる
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });

    // Daily ページに遷移
    await page.click('a[href="/daily"]');
    await page.waitForURL("**/daily", { timeout: 15000 });

    // LogCard にアクティビティ名と数量が表示される
    await page.waitForSelector('text="7km"', { timeout: 15000 });
    // E2Eランニングの LogCard が少なくとも1つ表示される
    await page
      .locator('text="E2Eランニング"')
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
  });
});
