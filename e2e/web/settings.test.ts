import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { navigateToSettings } from "../helpers/settings";

describe("settings", () => {
  const { getPage } = setupBrowser();

  it("設定ページの全セクションが表示される", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    // ヘッダー
    await page.waitForSelector('text="設定"', { timeout: 15000 });

    // アプリ設定セクション
    await page.waitForSelector('text="アプリ設定"', { timeout: 15000 });
    await page.waitForSelector('text="起動時に目標画面を表示"', {
      timeout: 15000,
    });
    await page.waitForSelector('text="目標グラフを非表示"', { timeout: 15000 });

    // アカウント設定セクション
    await page.waitForSelector('text="アカウント設定"', { timeout: 15000 });

    // APIキー管理セクション
    await page.waitForSelector('text="APIキー管理"', { timeout: 15000 });

    // データ管理セクション
    await page.waitForSelector('text="データ管理"', { timeout: 15000 });
    await page.waitForSelector('text="CSVから活動記録をインポート"', {
      timeout: 15000,
    });
    await page.waitForSelector('text="活動記録をCSVにエクスポート"', {
      timeout: 15000,
    });

    // アプリ情報セクション
    await page.waitForSelector('text="アプリ情報"', { timeout: 15000 });
    await page.waitForSelector('text="Actiko v2.0"', { timeout: 15000 });
  });

  it("アプリ設定のチェックボックスを切り替えられる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    const checkbox = page.locator("#show-goal-on-startup");
    expect(await checkbox.isChecked()).toBe(false);

    // チェックを入れる
    await checkbox.click();
    expect(await checkbox.isChecked()).toBe(true);

    // チェックを外す
    await checkbox.click();
    expect(await checkbox.isChecked()).toBe(false);
  });

  it("プライバシーポリシーモーダルを開ける", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    await page.click('button:has-text("プライバシーポリシー")');
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });

    // モーダルを閉じる
    await page.locator('.modal-backdrop button[aria-label="閉じる"]').click();
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });
  });

  it("利用規約モーダルを開ける", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    await page.click('button:has-text("利用規約")');
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });

    // モーダルを閉じる
    await page.locator('.modal-backdrop button[aria-label="閉じる"]').click();
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });
  });

  it("CSVエクスポートモーダルを開ける", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    await page.click('button:has-text("活動記録をCSVにエクスポート")');
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });

    // モーダルの内容を確認
    await page.waitForSelector('text="CSVエクスポート"', { timeout: 15000 });
    await page.waitForSelector('text="開始日"', { timeout: 15000 });
    await page.waitForSelector('text="終了日"', { timeout: 15000 });
    await page.waitForSelector('button:has-text("CSVをダウンロード")', {
      timeout: 15000,
    });

    // モーダルを閉じる
    await page.locator('.modal-backdrop button[aria-label="閉じる"]').click();
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });
  });

  it("CSVインポートモーダルを開ける", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    await page.click('button:has-text("CSVから活動記録をインポート")');
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });

    // モーダルを閉じる
    await page.locator('.modal-backdrop button[aria-label="閉じる"]').click();
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });
  });
});
