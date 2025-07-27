import { type Browser, type Page, chromium } from "@playwright/test";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

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

describe("Full E2E Signup with Playwright", () => {
  let browser: Browser;
  let page: Page;
  const TEST_BACKEND_PORT = 3461;
  let actualFrontendPort: number;

  beforeAll(async () => {
    console.log("Starting test backend...");
    await startTestBackend(TEST_BACKEND_PORT);

    console.log("Starting test frontend...");
    actualFrontendPort = await startTestFrontend(5176, TEST_BACKEND_PORT);

    console.log("Launching browser...");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    page = await context.newPage();

    // コンソールメッセージをキャプチャ
    page.on("console", (msg) => {
      console.log("Browser console:", msg.type(), msg.text());
    });

    page.on("pageerror", (error) => {
      console.log("Page error:", error.message);
    });

    // ネットワークリクエストをログ
    page.on("request", (request) => {
      console.log("Request:", request.method(), request.url());
      if (request.url().includes("/user") && request.method() === "POST") {
        console.log("Request headers:", request.headers());
        console.log("Request post data:", request.postData());
      }
    });

    page.on("response", async (response) => {
      console.log("Response:", response.status(), response.url());
      if (response.url().includes("/user")) {
        const body = await response.text();
        console.log("User endpoint response:", response.status(), body);
      }
    });
    console.log("Setup complete");
  }, 60000);

  afterAll(async () => {
    console.log("Cleaning up...");
    if (browser) await browser.close();
    await stopTestFrontend();
    await stopTestBackend();
    console.log("Cleanup complete");
  });

  beforeEach(async () => {
    const db = getTestDb();
    await resetTestDb(db);
  });

  it("should successfully sign up a new user", async () => {
    // フロントエンドにアクセス
    await page.goto(`http://localhost:${actualFrontendPort}`);

    // ページが読み込まれるのを待つ
    await page.waitForLoadState("networkidle");

    console.log("Looking for signup UI...");

    // 「New」タブをクリックして新規登録フォームに切り替える
    await page.getByText("New").click();
    console.log("Clicked New tab");

    // フォームが表示されるのを少し待つ
    await page.waitForTimeout(500);

    // フォームに入力
    console.log("Filling form...");

    // デバッグ: ページの内容を確認
    const pageContent = await page.textContent("body");
    console.log("Page content preview:", pageContent?.slice(0, 200));

    // より柔軟なセレクタを使用
    try {
      // ログインID
      const loginIdInput = page
        .locator('input[name="loginId"], input[placeholder*="ログインID"]')
        .first();
      await loginIdInput.fill("testuser123");
      console.log("Filled login ID");

      // パスワード
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill("Test123!@#");
      console.log("Filled password");

      // ユーザー名
      const usernameInput = page
        .locator('input[name="userName"], input[placeholder*="ユーザー名"]')
        .first();
      await usernameInput.fill("Test User");
      console.log("Filled username");
    } catch (error) {
      console.error("Error filling form:", error);
      // スクリーンショットを撮る
      await page.screenshot({ path: "signup-error.png" });
      throw error;
    }

    // 登録ボタンをクリック
    console.log("Submitting form...");
    const submitButton = page
      .locator('button[type="submit"], button:has-text("登録")')
      .first();
    await submitButton.click();
    console.log("Clicked submit button");

    // エラーメッセージを確認
    await page.waitForTimeout(1000); // Give time for any error to appear

    // デバッグ: ページの最終状態を確認
    const finalContent = await page.textContent("body");
    console.log("Page content after submit:", finalContent?.slice(0, 300));

    // 成功後のリダイレクトを待つ（まずは短いタイムアウトで）
    try {
      await page.waitForURL(/\/(actiko|new-goal|today)/, { timeout: 5000 });
      console.log("Signup successful! Current URL:", page.url());
    } catch (e) {
      // URLが変わらない場合、エラーメッセージを探す
      const errorElement = page.locator("text=Failed to fetch").first();
      if (await errorElement.isVisible()) {
        throw new Error(
          "API connection failed - 'Failed to fetch' error detected",
        );
      }
      throw e;
    }

    // 認証後のUIが表示されることを確認
    const navigationVisible = await page.getByRole("navigation").isVisible();
    expect(navigationVisible).toBe(true);
  }, 60000);
});
