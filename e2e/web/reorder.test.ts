import { describe, expect, it } from "vitest";

import { activityGridSection, createActivity } from "../helpers/actiko";
import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";

describe("reorder", () => {
  const { getPage } = setupBrowser();

  it("アクティビティを並び替えられる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // 並び替えには2つ以上のアクティビティが必要
    // 追加のアクティビティを作成
    await createActivity(page, "並替テスト活動", "回");

    // ホーム画面でのアクティビティの順序を記録（ActivityCard内のactivity name）
    const homeActivityNames = activityGridSection(page).locator(
      ".grid span.font-medium",
    );
    await homeActivityNames
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
    const firstNameBefore = await homeActivityNames.first().textContent();

    // 並び替えボタンが表示される（2つ以上のアクティビティがある場合のみ）
    const reorderButton = activityGridSection(page).getByRole("button", {
      name: "並び替え",
      exact: true,
    });
    await reorderButton.waitFor({ state: "visible", timeout: 15000 });
    await reorderButton.click();

    // 並び替えダイアログが開く
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });
    await page.waitForSelector('h2:has-text("並び替え")', { timeout: 15000 });

    // アクティビティが一覧に表示される
    const dialog = page.locator(".modal-backdrop");
    await dialog
      .locator('text="E2Eランニング"')
      .waitFor({ state: "visible", timeout: 15000 });
    await dialog
      .locator('text="並替テスト活動"')
      .waitFor({ state: "visible", timeout: 15000 });

    // ダイアログ内のアイテム一覧の順序を記録
    const dialogItems = dialog.locator("span.font-medium.text-gray-800");
    const firstItemBefore = await dialogItems.first().textContent();

    // 下矢印ボタンで最初のアイテムを下に移動
    const firstItem = dialog.locator("div.flex.items-center.gap-2").first();
    await firstItem.locator("button").last().click();

    // ダイアログ内で順序が変わったことを確認
    const firstItemAfter = await dialogItems.first().textContent();
    expect(firstItemAfter).not.toBe(firstItemBefore);

    // 保存
    await dialog.locator('button:has-text("保存")').click();

    // ダイアログが閉じる
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });

    // ホーム画面の順序が保存後に変わったことを確認（同期反映を待つためポーリング）
    await homeActivityNames
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
    await expect
      .poll(async () => homeActivityNames.first().textContent(), {
        timeout: 15000,
      })
      .not.toBe(firstNameBefore);
  });
});
