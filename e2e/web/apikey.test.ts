import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { navigateToSettings } from "../helpers/settings";

describe("apikey", () => {
  const { getPage } = setupBrowser();

  it("プレミアムユーザーはAPIキー管理セクションが表示される", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    // APIキー管理セクション
    await page.waitForSelector('text="APIキー管理"', { timeout: 15000 });

    // プレミアムなので「+ 新規作成」ボタンが表示される（「プレミアムプラン限定機能」ではない）
    await page.waitForSelector('button:has-text("+ 新規作成")', {
      timeout: 15000,
    });
    expect(
      await page.locator('text="プレミアムプラン限定機能"').isVisible(),
    ).toBe(false);
  });

  it("APIキーを作成できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    // 「+ 新規作成」ボタンをクリック
    await page.waitForSelector('button:has-text("+ 新規作成")', {
      timeout: 15000,
    });
    await page.click('button:has-text("+ 新規作成")');

    // CreateApiKeyDialog が開く
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });
    await page.waitForSelector('text="新しいAPIキーの作成"', {
      timeout: 15000,
    });

    // 名前を入力
    await page.fill('input[placeholder="例: 開発用APIキー"]', "E2Eテストキー");

    // 作成
    await page.click('button[type="submit"]:has-text("作成")');

    // 成功画面: APIキーが表示される
    await page.waitForSelector('text="APIキーが作成されました"', {
      timeout: 15000,
    });
    await page.waitForSelector(
      'text="このAPIキーは一度しか表示されません。必ずコピーして安全に保管してください。"',
      { timeout: 15000 },
    );

    // APIキーのコードが表示されている
    const codeElement = page.locator(".modal-backdrop code");
    const keyText = await codeElement.textContent();
    expect(keyText).toBeTruthy();
    expect(keyText!.length).toBeGreaterThan(0);

    // モーダルを閉じる
    await page.locator('.modal-backdrop button[aria-label="閉じる"]').click();
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });

    // APIキーリストに「E2Eテストキー」が表示される
    await page.waitForSelector('text="E2Eテストキー"', { timeout: 15000 });
  });

  it("APIキーを削除できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    // 「+ 新規作成」ボタンが表示されるのを待つ
    await page.waitForSelector('button:has-text("+ 新規作成")', {
      timeout: 15000,
    });

    // 削除テスト用のキーを新規作成（前テストからの残存に依存しない）
    await page.click('button:has-text("+ 新規作成")');
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });
    await page.fill('input[placeholder="例: 開発用APIキー"]', "削除テストキー");
    await page.click('button[type="submit"]:has-text("作成")');
    await page.waitForSelector('text="APIキーが作成されました"', {
      timeout: 15000,
    });
    await page.locator('.modal-backdrop button[aria-label="閉じる"]').click();
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });

    // 作成されたキーが表示される
    await page.waitForSelector('text="削除テストキー"', { timeout: 15000 });

    // 「削除テストキー」のテキストを含む行の削除ボタンをクリック
    const keyName = page.locator("span.font-medium", {
      hasText: "削除テストキー",
    });
    const parentRow = keyName.locator("..");
    await parentRow.locator("button").click();

    // 確認UI: 「削除」と「取消」ボタンが表示される
    await parentRow
      .locator('button:has-text("削除")')
      .waitFor({ state: "visible", timeout: 15000 });

    // 赤い「削除」ボタンをクリック
    await parentRow.locator('button:has-text("削除")').click();

    // キーが消える
    await page.waitForSelector('text="削除テストキー"', {
      state: "detached",
      timeout: 15000,
    });
  });
});
