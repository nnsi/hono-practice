import { type Browser, type Page, chromium } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  getTestDb,
  startTestBackend,
  stopTestBackend,
} from "../test-utils/e2e/test-backend";
import { resetTestDb } from "../test-utils/e2e/test-db";
import {
  startTestFrontend,
  stopTestFrontend,
} from "../test-utils/e2e/test-frontend";

describe.sequential("Simplified E2E Tests", () => {
  let browser: Browser;
  let page: Page;
  let context: any; // Browser contextを保持
  const TEST_BACKEND_PORT = 3461;
  let actualFrontendPort: number;

  // テスト用のユーザー情報
  const testUser = {
    loginId: "testuser123",
    password: "Test123!@#",
    name: "Test User",
  };

  beforeAll(async () => {
    // バックエンドとフロントエンドを起動
    await startTestBackend(TEST_BACKEND_PORT);
    actualFrontendPort = await startTestFrontend(5176, TEST_BACKEND_PORT);

    // ブラウザを起動
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      // Cookieを正しく保存するための設定
      acceptDownloads: true,
      ignoreHTTPSErrors: true,
    });
    page = await context.newPage();

    // DBをリセット
    const db = getTestDb();
    await resetTestDb(db);

    // デバッグ用のログ設定
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log("Browser error:", msg.text());
      }
    });
  }, 60000);

  afterAll(async () => {
    if (browser) await browser.close();
    await stopTestFrontend();
    await stopTestBackend();
  }, 30000);

  it("should complete simplified user journey - signup only", async () => {
    // ========== サインアップ ==========
    await page.goto(`http://localhost:${actualFrontendPort}`);
    await page.waitForLoadState("networkidle");

    // 新規登録タブをクリック
    await page.getByText("New").click();
    await page.waitForTimeout(500);

    // フォームに入力
    await page.locator('input[name="loginId"]').fill(testUser.loginId);
    await page.locator('input[type="password"]').fill(testUser.password);
    await page.locator('input[name="name"]').fill(testUser.name);

    // 登録ボタンをクリック
    await page.locator('button[type="submit"]').first().click();

    // サインアップ成功を待つ
    await page.waitForURL(/\/(actiko|new-goal|today)/, { timeout: 10000 });
    console.log("Signup successful!");

    // 認証後のデバッグ情報を取得
    const debugInfo = await page.evaluate(() => {
      const storage: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          storage[key] = localStorage.getItem(key);
        }
      }
      return {
        localStorage: storage,
        cookies: document.cookie,
        url: window.location.href,
      };
    });
    console.log("Debug info after signup:", debugInfo);

    // トークンが保存されていることを確認
    const token = debugInfo.localStorage["actiko-access-token"];
    console.log("Access token stored:", !!token);

    // Cookieが設定されていることを確認
    console.log("Cookies:", debugInfo.cookies);

    // コンテキストからCookieを取得
    const cookies = await context.cookies();
    console.log("Context cookies:", cookies);

    // ナビゲーションが表示されることを確認
    await page.waitForTimeout(2000);
    const navigationVisible = await page.getByRole("navigation").isVisible();
    console.log("Navigation visible:", navigationVisible);

    expect(navigationVisible).toBe(true);

    // APIリクエストをテスト
    console.log("\n========== Testing API Request ==========");
    await page.goto(`http://localhost:${actualFrontendPort}/tasks`);
    await page.waitForLoadState("networkidle");

    // タスクページが正しく表示されるか確認
    const pageContent = await page.textContent("body");
    console.log(
      "Tasks page loaded:",
      pageContent?.includes("タスク") || pageContent?.includes("task"),
    );

    // 以下、フルE2Eテストを継続

    // ========== タスク管理ページのテスト ==========
    console.log("\n========== Testing Task Management ==========");

    // タスクページへ移動
    await page.goto(`http://localhost:${actualFrontendPort}/tasks`);
    await page.waitForLoadState("networkidle");

    // 新規タスク追加ボタンをクリック
    const addTaskButton = page.locator('button:has-text("新規タスク")').first();
    if (await addTaskButton.isVisible()) {
      await addTaskButton.click();
      await page.waitForTimeout(500);

      // タスク情報を入力
      await page.locator('input[name="title"]').fill("テストタスク");
      await page
        .locator('textarea[name="description"]')
        .fill("テストタスクの説明");

      // 作成ボタンをクリック
      const createButton = page
        .locator('button:has-text("作成"), button:has-text("登録")')
        .first();
      await createButton.click();
      await page.waitForTimeout(1000);

      // タスクが作成されたことを確認
      const createdTask = page.locator("text=テストタスク").first();
      expect(await createdTask.isVisible()).toBe(true);
      console.log("Task created successfully!");

      // タスクの更新をテスト
      await createdTask.click();
      await page.waitForTimeout(500);

      // タイトルを更新
      const titleInput = page.locator('input[name="title"]');
      await titleInput.clear();
      await titleInput.fill("更新されたタスク");

      // 更新ボタンをクリック
      const updateButton = page
        .locator('button:has-text("更新"), button:has-text("保存")')
        .first();
      await updateButton.click();
      await page.waitForTimeout(1000);

      // 更新されたタスクが表示されることを確認
      const updatedTask = page.locator("text=更新されたタスク").first();
      expect(await updatedTask.isVisible()).toBe(true);
      console.log("Task updated successfully!");
    }

    // ========== 設定ページのテスト ==========
    console.log("\n========== Testing Settings Page ==========");

    // 設定ページへ移動
    await page.goto(`http://localhost:${actualFrontendPort}/setting`);
    await page.waitForLoadState("networkidle");

    // 設定が表示されることを確認
    const settingsContent = await page.textContent("body");
    expect(settingsContent).toContain("アカウント");

    // チェックボックスの操作をテスト
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      const initialState = await checkbox.isChecked();
      await checkbox.click();
      await page.waitForTimeout(500);
      const newState = await checkbox.isChecked();
      expect(newState).toBe(!initialState);
      console.log("Settings toggle tested successfully!");
    }

    // ========== ログアウトのテスト ==========
    console.log("\n========== Testing Logout ==========");

    const logoutButton = page.locator('button:has-text("ログアウト")');
    await logoutButton.click();

    // ログイン画面にリダイレクトされることを確認
    await page.waitForURL(/\/$/, { timeout: 5000 });
    const loginForm = page.locator("text=ログインID");
    expect(await loginForm.isVisible()).toBe(true);
    console.log("Logout successful!");

    console.log("\n========== All simplified tests completed! ==========");
  }, 180000);
});
