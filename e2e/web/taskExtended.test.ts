import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { openTaskCreateDialog } from "../helpers/task";

describe("task extended", () => {
  const { getPage } = setupBrowser();

  it("タスクにメモを付けて作成・表示できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/tasks"]');
    await page.waitForURL("**/tasks", { timeout: 15000 });

    await openTaskCreateDialog(page);
    await page.fill(
      'input[placeholder="タスクのタイトルを入力"]',
      "メモ付タスク",
    );
    await page.fill(
      'textarea[placeholder="タスクに関するメモを入力"]',
      "これはメモです",
    );
    await page.click('button[type="submit"]:has-text("作成")');
    await page.waitForSelector('text="メモ付タスク"', { timeout: 15000 });

    // 編集ダイアログを開いてメモが保持されていることを確認
    await page
      .locator("div.cursor-pointer", { hasText: "メモ付タスク" })
      .click();
    await page.waitForSelector('text="タスクを編集"', { timeout: 15000 });
    const memoInput = page.locator(
      'textarea[placeholder="タスクに関するメモ"]',
    );
    expect(await memoInput.inputValue()).toBe("これはメモです");
  });

  it("アーカイブ済みタブに切り替えアーカイブ済タスクが表示される", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/tasks"]');
    await page.waitForURL("**/tasks", { timeout: 15000 });

    // 作成 → 完了 → アーカイブ
    await openTaskCreateDialog(page);
    await page.fill(
      'input[placeholder="タスクのタイトルを入力"]',
      "アーカイブタブ検証",
    );
    await page.click('button[type="submit"]:has-text("作成")');
    await page.waitForSelector('text="アーカイブタブ検証"', {
      timeout: 15000,
    });

    const taskRow = page
      .locator(".rounded-2xl")
      .filter({ hasText: "アーカイブタブ検証" })
      .first();
    await taskRow.locator('button[aria-label="完了にする"]').click();

    // 完了済みセクションを展開
    await page.getByRole("button", { name: /完了済みを表示/ }).click();

    await taskRow
      .locator('button[aria-label="未完了に戻す"]')
      .waitFor({ state: "visible", timeout: 15000 });
    await taskRow.locator('button[title="アーカイブ"]').click();

    // Active タブからは消える
    await page.waitForSelector('text="アーカイブタブ検証"', {
      state: "detached",
      timeout: 15000,
    });

    // Archived タブに切り替え
    await page.click('button:has-text("アーカイブ済み")');
    await page.waitForSelector('text="アーカイブタブ検証"', {
      timeout: 15000,
    });

    // Active タブへ戻る
    await page.click('button:has-text("アクティブ")');
    await page.waitForSelector('text="アーカイブタブ検証"', {
      state: "detached",
      timeout: 15000,
    });
  });

  it("編集ダイアログの削除ボタンから削除確認モーダルが開く", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/tasks"]');
    await page.waitForURL("**/tasks", { timeout: 15000 });

    await openTaskCreateDialog(page);
    await page.fill(
      'input[placeholder="タスクのタイトルを入力"]',
      "編集から削除",
    );
    await page.click('button[type="submit"]:has-text("作成")');
    await page.waitForSelector('text="編集から削除"', { timeout: 15000 });

    await page
      .locator("div.cursor-pointer", { hasText: "編集から削除" })
      .click();
    await page.waitForSelector('text="タスクを編集"', { timeout: 15000 });

    await page.click('button:has-text("削除")');
    await page.waitForSelector('text="タスクを削除しますか？"', {
      timeout: 15000,
    });

    // キャンセルでダイアログを閉じる
    await page.click('button:has-text("キャンセル")');
    await page.waitForSelector('text="タスクを削除しますか？"', {
      state: "detached",
      timeout: 15000,
    });
  });
});
