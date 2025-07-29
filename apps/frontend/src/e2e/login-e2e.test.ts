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

describe.sequential("Login E2E Tests", () => {
  let browser: Browser;
  let page: Page;
  let context: any; // Browser contextを保持
  const TEST_BACKEND_PORT = 3462; // 他のテストと違うポートを使用
  let actualFrontendPort: number;

  // テスト用のユーザー情報
  const testUser = {
    loginId: "logintest123",
    password: "Test123!@#",
    name: "Login Test User",
  };

  beforeAll(async () => {
    // バックエンドとフロントエンドを起動
    await startTestBackend(TEST_BACKEND_PORT);
    actualFrontendPort = await startTestFrontend(5177, TEST_BACKEND_PORT);

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

  it("should login with existing user", async () => {
    // まず、ユーザーを作成（APIを使用）
    const signupResponse = await fetch(
      `http://localhost:${TEST_BACKEND_PORT}/user`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: testUser.name,
          login_id: testUser.loginId,
          password: testUser.password,
        }),
      },
    );
    expect(signupResponse.status).toBe(200);

    // ログインページにアクセス
    await page.goto(`http://localhost:${actualFrontendPort}`);
    await page.waitForLoadState("networkidle");

    // ログインタブが選択されていることを確認
    const loginTabActive = await page
      .locator('[value="login"]')
      .getAttribute("data-state");
    if (loginTabActive !== "active") {
      await page.getByText("Login").click();
      await page.waitForTimeout(500);
    }

    // ログインフォームに入力
    await page.locator('input[name="login_id"]').fill(testUser.loginId);
    await page.locator('input[type="password"]').fill(testUser.password);

    // ログインボタンをクリック
    await page.locator('button[type="submit"]').first().click();

    // ログイン成功後のリダイレクトを待つ
    await page.waitForTimeout(2000);

    // localStorageの確認
    const storageDebug = await page.evaluate(() => {
      const storage: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          storage[key] = localStorage.getItem(key);
        }
      }
      return storage;
    });
    console.log("LocalStorage after login:", storageDebug);

    // トークンが保存されたことを確認
    const token = storageDebug["actiko-access-token"];
    expect(token).toBeTruthy();

    // ページをリロードして認証状態を再チェック
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // 認証後のページへのリダイレクトを確認
    const finalUrl = page.url();
    console.log("URL after login:", finalUrl);
    const isAuthenticated =
      finalUrl.includes("/actiko") ||
      finalUrl.includes("/today") ||
      finalUrl.includes("/new-goal");
    expect(isAuthenticated).toBe(true);

    console.log("Login test completed successfully!");
  }, 60000);

  it("should show error for invalid credentials", async () => {
    // ログインページにアクセス
    await page.goto(`http://localhost:${actualFrontendPort}`);
    await page.waitForLoadState("networkidle");

    // ログインタブを選択
    const loginTabActive = await page
      .locator('[value="login"]')
      .getAttribute("data-state");
    if (loginTabActive !== "active") {
      await page.getByText("Login").click();
      await page.waitForTimeout(500);
    }

    // 無効な認証情報で入力
    await page.locator('input[name="login_id"]').fill("invalid_user");
    await page.locator('input[type="password"]').fill("wrong_password");

    // ログインボタンをクリック
    await page.locator('button[type="submit"]').first().click();

    // エラーメッセージを待つ
    await page.waitForTimeout(2000);

    // エラートーストまたはメッセージを確認
    const errorVisible = await page
      .locator('.text-destructive, [role="alert"]')
      .first()
      .isVisible();
    expect(errorVisible).toBe(true);

    console.log("Invalid login test completed successfully!");
  }, 60000);
});
