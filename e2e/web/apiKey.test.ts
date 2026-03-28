import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { BACKEND_PORT } from "../helpers/config";
import { navigateToSettings } from "../helpers/settings";

const API_URL = `http://localhost:${BACKEND_PORT}`;

describe("apiKey", () => {
  const { getPage } = setupBrowser();
  let createdApiKey: string;

  it("Pro ユーザーの設定画面に API キーセクションが表示される", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    await page.waitForSelector('text="API キー"', { timeout: 15000 });
    await page.waitForSelector('button:has-text("+ 新規作成")', {
      timeout: 15000,
    });
    await page.waitForSelector('text="APIキーがありません"', {
      timeout: 15000,
    });
  });

  it("API キーを作成できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    // 新規作成ダイアログを開く
    await page.click('button:has-text("+ 新規作成")');
    await page.waitForSelector('text="新しいAPIキーの作成"', {
      timeout: 15000,
    });

    // 名前を入力して作成
    await page.fill('input[placeholder="例: 開発用APIキー"]', "E2Eテスト用");
    await page.click('button[type="submit"]');

    // 作成完了画面
    await page.waitForSelector('text="APIキーが作成されました"', {
      timeout: 15000,
    });

    // APIキーを取得
    const keyElement = page.locator("code");
    const keyText = await keyElement.textContent();
    expect(keyText).toMatch(/^api_/);
    createdApiKey = keyText!;

    // ダイアログを閉じる
    await page.click('button[aria-label="Close"]');
    await page.waitForSelector('text="APIキーが作成されました"', {
      state: "detached",
      timeout: 15000,
    });

    // 一覧に表示される
    await page.waitForSelector('text="E2Eテスト用"', { timeout: 15000 });
  });

  it("作成した API キーで Task を作成できる", async () => {
    expect(createdApiKey).toBeTruthy();

    const res = await fetch(`${API_URL}/api/v1/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${createdApiKey}`,
      },
      body: JSON.stringify({
        title: "APIキーE2Eテストタスク",
        startDate: "2026-03-25",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("APIキーE2Eテストタスク");
    expect(body.id).toBeTruthy();
  });

  it("API キーを削除できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await navigateToSettings(page);

    // 一覧にAPIキーが表示されている
    await page.waitForSelector('text="E2Eテスト用"', { timeout: 15000 });

    // ゴミ箱ボタンをクリック（Trash2アイコン）
    const trashButton = page.locator(
      'text="E2Eテスト用" >> xpath=.. >> button',
    );
    await trashButton.click();

    // 2段階確認UIで「削除」をクリック
    await page.waitForSelector('button:has-text("削除")', { timeout: 15000 });
    await page.click('button:has-text("削除")');

    // 一覧が空になる
    await page.waitForSelector('text="APIキーがありません"', {
      timeout: 15000,
    });
  });

  it("削除した API キーでアクセスすると 401 が返る", async () => {
    expect(createdApiKey).toBeTruthy();

    const res = await fetch(`${API_URL}/api/v1/tasks?date=2026-03-25`, {
      headers: {
        Authorization: `Bearer ${createdApiKey}`,
      },
    });

    expect(res.status).toBe(401);
  });
});
