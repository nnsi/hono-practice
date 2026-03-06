import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { openTaskCreateDialog } from "../helpers/task";

describe("task", () => {
  const { getPage } = setupBrowser();

  it("タスクを作成できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/tasks"]');
    await page.waitForURL("**/tasks", { timeout: 15000 });

    await openTaskCreateDialog(page);

    await page.fill(
      'input[placeholder="タスクのタイトルを入力"]',
      "E2Eテストタスク",
    );
    await page.click('button[type="submit"]:has-text("作成")');

    await page.waitForSelector('text="E2Eテストタスク"', { timeout: 15000 });
  });

  it("タスクの完了トグルができる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/tasks"]');
    await page.waitForURL("**/tasks", { timeout: 15000 });

    await openTaskCreateDialog(page);
    await page.fill(
      'input[placeholder="タスクのタイトルを入力"]',
      "完了トグルテスト",
    );
    await page.click('button[type="submit"]:has-text("作成")');
    await page.waitForSelector('text="完了トグルテスト"', { timeout: 15000 });

    // 作成したタスク行にスコープを絞る
    const taskRow = page
      .locator(".rounded-2xl")
      .filter({ hasText: "完了トグルテスト" })
      .first();

    // 完了ボタン（○アイコン）をクリック
    await taskRow.locator('button[aria-label="完了にする"]').click();

    // 「未完了に戻す」ボタンが表示される
    await taskRow
      .locator('button[aria-label="未完了に戻す"]')
      .waitFor({ state: "visible", timeout: 15000 });
  });

  it("タスクを編集できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/tasks"]');
    await page.waitForURL("**/tasks", { timeout: 15000 });

    await openTaskCreateDialog(page);
    await page.fill(
      'input[placeholder="タスクのタイトルを入力"]',
      "編集前タスク",
    );
    await page.click('button[type="submit"]:has-text("作成")');
    await page.waitForSelector('text="編集前タスク"', { timeout: 15000 });

    // タスクのテキスト部分（cursor-pointer領域）をクリックして編集ダイアログを開く
    await page
      .locator("div.cursor-pointer", { hasText: "編集前タスク" })
      .click();
    await page.waitForSelector('text="タスクを編集"', { timeout: 15000 });

    // タイトルを変更
    const titleInput = page.locator('input[placeholder="タスクのタイトル"]');
    await titleInput.fill("編集後タスク");
    await page.click('button:has-text("更新")');

    // 更新後の名前が表示される
    await page.waitForSelector('text="編集後タスク"', { timeout: 15000 });
  });

  it("タスクを削除できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/tasks"]');
    await page.waitForURL("**/tasks", { timeout: 15000 });

    // 削除用タスクを作成
    await openTaskCreateDialog(page);
    await page.fill(
      'input[placeholder="タスクのタイトルを入力"]',
      "削除対象タスク",
    );
    await page.click('button[type="submit"]:has-text("作成")');
    await page.waitForSelector('text="削除対象タスク"', { timeout: 15000 });

    // 編集ダイアログを開く
    await page
      .locator("div.cursor-pointer", { hasText: "削除対象タスク" })
      .click();
    await page.waitForSelector('text="タスクを編集"', { timeout: 15000 });

    // 「削除」ボタンをクリック → DeleteConfirmDialog が開く
    await page.click('button:has-text("削除")');
    await page.waitForSelector('text="タスクを削除しますか？"', {
      timeout: 15000,
    });

    // 「削除する」で確定
    await page.click('button:has-text("削除する")');

    // ダイアログが閉じ、タスクが消える
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });
    expect(await page.locator('text="削除対象タスク"').isVisible()).toBe(false);
  });

  it("タスクをアーカイブできる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/tasks"]');
    await page.waitForURL("**/tasks", { timeout: 15000 });

    // アーカイブ用タスクを作成
    await openTaskCreateDialog(page);
    await page.fill(
      'input[placeholder="タスクのタイトルを入力"]',
      "アーカイブ対象",
    );
    await page.click('button[type="submit"]:has-text("作成")');
    await page.waitForSelector('text="アーカイブ対象"', { timeout: 15000 });

    // まず完了にする（アーカイブは完了タスクのみ可能）
    const taskRow = page
      .locator(".rounded-2xl")
      .filter({ hasText: "アーカイブ対象" })
      .first();
    await taskRow.locator('button[aria-label="完了にする"]').click();
    await taskRow
      .locator('button[aria-label="未完了に戻す"]')
      .waitFor({ state: "visible", timeout: 15000 });

    // アーカイブボタンをクリック
    await taskRow.locator('button[title="アーカイブ"]').click();

    // タスクがアクティブ一覧から消える
    await page.waitForSelector('text="アーカイブ対象"', {
      state: "detached",
      timeout: 15000,
    });
  });

  it("タスクに日付を設定できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/tasks"]');
    await page.waitForURL("**/tasks", { timeout: 15000 });

    // 日付設定用タスクを作成
    await openTaskCreateDialog(page);
    await page.fill(
      'input[placeholder="タスクのタイトルを入力"]',
      "日付テストタスク",
    );
    await page.click('button[type="submit"]:has-text("作成")');
    await page.waitForSelector('text="日付テストタスク"', { timeout: 15000 });

    // 編集ダイアログを開く
    await page
      .locator("div.cursor-pointer", { hasText: "日付テストタスク" })
      .click();
    await page.waitForSelector('text="タスクを編集"', { timeout: 15000 });

    // 「期限（任意）」の DatePickerField をクリックしてカレンダーを開く
    const dueDateSection = page.locator('text="期限（任意）"').locator("..");
    await dueDateSection.locator("button").first().click();

    // CalendarPopover が開く — 当月の日付セルをクリック
    // 現在月の日付ボタン（text-gray-700 = 当月）の中から28日を選択
    await page.waitForSelector(".grid-cols-7", { timeout: 15000 });
    await page
      .locator(".grid-cols-7 button.text-gray-700")
      .filter({ hasText: /^28$/ })
      .click();

    // 更新ボタンをクリック
    await page.click('button:has-text("更新")');

    // ダイアログが閉じる
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });

    // タスクカードに日付が表示される（MM/DD 形式）
    const taskCard = page
      .locator(".rounded-2xl")
      .filter({ hasText: "日付テストタスク" })
      .first();
    // CalendarDays アイコンの横に日付テキストが表示される
    const dateText = taskCard.locator(".text-xs.text-gray-500");
    await dateText.waitFor({ state: "visible", timeout: 15000 });
  });
});
