import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { createGoal, navigateToGoals } from "../helpers/goal";

describe("goal", () => {
  const { getPage } = setupBrowser();

  it("目標を作成できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToGoals(page);

    await createGoal(page, "E2Eランニング", "5");

    // GoalCard が useLiveQuery で描画されるまで待機
    await page.waitForSelector('text="E2Eランニング"', { timeout: 15000 });
  });

  it("目標を編集できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToGoals(page);

    // 識別可能なターゲット値で目標作成
    await createGoal(page, "E2Eランニング", "77");
    await page.waitForSelector("text=/77km/", { timeout: 15000 });

    // GoalCard の編集ボタン（Pencil アイコン）をクリック
    // 77km を含む GoalCard を特定
    const goalCard = page
      .locator(".rounded-2xl")
      .filter({ hasText: /77km/ })
      .first();
    await goalCard.locator("button:has(.lucide-pencil)").click();

    // EditGoalForm が表示される
    await page.waitForSelector(".border-blue-300", { timeout: 15000 });

    // 日次目標を変更
    const targetInput = page.locator('.border-blue-300 input[type="number"]');
    await targetInput.fill("88");
    await page.click('.border-blue-300 button:has-text("保存")');

    // 更新された値が GoalCard に反映される
    await page.waitForSelector("text=/88km/", { timeout: 15000 });
    // 旧値が消えていること
    expect(await page.locator("text=/77km/").isVisible()).toBe(false);
  });

  it("目標を削除できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToGoals(page);

    // 識別可能なターゲット値で目標作成
    await createGoal(page, "E2Eランニング", "99");
    await page.waitForSelector("text=/99km/", { timeout: 15000 });

    // 99km を含む GoalCard の編集ボタンをクリック
    const goalCard = page
      .locator(".rounded-2xl")
      .filter({ hasText: /99km/ })
      .first();
    await goalCard.locator("button:has(.lucide-pencil)").click();
    await page.waitForSelector(".border-blue-300", { timeout: 15000 });

    // 2段階削除：Trash アイコンボタン → 赤背景の「削除」ボタン
    const editForm = page.locator(".border-blue-300");
    await editForm.locator("button.border-red-300").click();
    await editForm.locator("button.bg-red-500").click();

    // 削除した目標の表示が消える
    await page.waitForSelector("text=/99km/", {
      state: "detached",
      timeout: 15000,
    });
  });

  it("目標から記録できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToGoals(page);

    await createGoal(page, "E2Eランニング", "5");

    // GoalCard が表示されるまで待つ
    await page.waitForSelector('text="E2Eランニング"', { timeout: 15000 });

    // 作成した GoalCard にスコープを絞って PlusCircle ボタンをクリック
    const goalCard = page
      .locator(".rounded-2xl")
      .filter({ hasText: "E2Eランニング" })
      .first();
    await goalCard.locator('button[title="活動を記録"]').click();

    // RecordDialog が開く
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });

    // モーダル内の数量入力フィールドに記録
    const modal = page.locator(".modal-backdrop");
    const quantityInput = modal.locator('input[type="number"]');
    await quantityInput.fill("3");
    await page.click('button:has-text("記録する")');

    // ダイアログが閉じる
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });
  });
});
