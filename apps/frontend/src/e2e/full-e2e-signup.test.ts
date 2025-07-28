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

describe.sequential("Full E2E Signup with Playwright", () => {
  let browser: Browser;
  let page: Page;
  const TEST_BACKEND_PORT = 3461;
  let actualFrontendPort: number;
  let cleanupInProgress = false;

  // テスト用のユーザー情報を共有
  const testUser = {
    loginId: "testuser123",
    password: "Test123!@#",
    name: "Test User",
  };

  beforeAll(async () => {
    console.log("Starting test backend...");
    await startTestBackend(TEST_BACKEND_PORT);

    console.log("Starting test frontend...");
    actualFrontendPort = await startTestFrontend(5176, TEST_BACKEND_PORT);

    console.log("Launching browser...");
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    page = await context.newPage();

    // DBをリセット（最初に1回だけ）
    console.log("Resetting test database...");
    const db = getTestDb();
    await resetTestDb(db);

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

    // プロセス終了ハンドラを設定
    const cleanup = async () => {
      if (cleanupInProgress) return;
      cleanupInProgress = true;
      console.log("Process exit handler triggered");

      try {
        if (browser) await browser.close();
      } catch (e) {}

      try {
        await stopTestFrontend();
      } catch (e) {}

      try {
        await stopTestBackend();
      } catch (e) {}

      process.exit(1);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("uncaughtException", (err) => {
      console.error("Uncaught exception:", err);
      cleanup();
    });
    process.on("unhandledRejection", (err) => {
      console.error("Unhandled rejection:", err);
      cleanup();
    });
  }, 60000);

  afterAll(async () => {
    if (cleanupInProgress) return;
    cleanupInProgress = true;

    console.log("Cleaning up...");
    try {
      if (browser) {
        await browser.close().catch(() => {});
      }
    } catch (e) {
      console.error("Error closing browser:", e);
    }

    try {
      await stopTestFrontend();
    } catch (e) {
      console.error("Error stopping frontend:", e);
    }

    try {
      await stopTestBackend();
    } catch (e) {
      console.error("Error stopping backend:", e);
    }

    console.log("Cleanup complete");
  }, 30000);

  it("should complete full user journey from signup to logout", async () => {
    // ========== サインアップ ==========
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
      await loginIdInput.fill(testUser.loginId);
      console.log("Filled login ID");

      // パスワード
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill(testUser.password);
      console.log("Filled password");

      // ユーザー名
      const usernameInput = page
        .locator('input[name="name"], input[placeholder*="ユーザー名"]')
        .first();
      await usernameInput.fill(testUser.name);
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

    // localStorageとcookiesの内容を確認
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
      };
    });
    console.log("Debug info after signup:", debugInfo);

    // トークンが正しく保存されていることを確認
    const token = debugInfo.localStorage["actiko-access-token"];
    console.log("Stored token:", token);
    expect(token).toBeTruthy();

    // APIリクエストが成功するまで待機
    await page.waitForTimeout(2000);

    // 認証後のUIが表示されることを確認
    const navigationVisible = await page.getByRole("navigation").isVisible();
    expect(navigationVisible).toBe(true);

    // 以下、全てのテストを同じセッション内で実行

    // ========== 活動記録ページのテスト ==========
    console.log("\n========== Testing Activity Page ==========");

    // 活動ページに移動して新規追加をテスト（絵文字ピッカーは使わない）
    const actikoNavLink = page.locator('a[href="/actiko"]').first();
    if (await actikoNavLink.isVisible()) {
      await actikoNavLink.click();
      await page.waitForURL(/\/actiko/, { timeout: 5000 });
    } else {
      await page.goto(`http://localhost:${actualFrontendPort}/actiko`);
    }

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // ページの内容を確認
    const actikoPageContent = await page.textContent("body");
    console.log("Actiko page content:", actikoPageContent?.slice(0, 300));

    // 新規活動の追加
    console.log("Creating test activity...");

    // 新規活動追加ボタンをクリック
    const addActivityButton = page
      .locator('button:has-text("新規活動")')
      .first();
    await addActivityButton.waitFor({ state: "visible", timeout: 5000 });
    await addActivityButton.click();
    await page.waitForTimeout(500);

    // テスト用に固定の絵文字を直接入力
    await page.evaluate(() => {
      const emojiInput = document.querySelector(
        'input[name="emoji"]',
      ) as HTMLInputElement;
      if (emojiInput) {
        emojiInput.value = "🎯";
        emojiInput.dispatchEvent(new Event("change", { bubbles: true }));
        emojiInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    // 活動名と単位を入力
    await page.locator('input[name="name"]').fill("テスト活動");
    await page.locator('input[name="unit"]').fill("回");

    // 登録ボタンをクリック
    await page.locator('button:has-text("登録")').click();
    await page.waitForTimeout(1000);

    // 活動が作成されたことを確認
    const createdActivity = page.locator("text=テスト活動").first();
    expect(await createdActivity.isVisible()).toBe(true);
    console.log("Activity created successfully!");

    // ========== 日次活動記録ページのテスト ==========
    console.log("\n========== Testing Daily Page ==========");

    // 日次ページへ移動
    const dailyNavLink = page.locator('a[href="/daily"]').first();
    if (await dailyNavLink.isVisible()) {
      await dailyNavLink.click();
      await page.waitForURL(/\/daily/, { timeout: 5000 });
    } else {
      await page.goto(`http://localhost:${actualFrontendPort}/daily`);
    }

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    console.log("Testing daily page activity log creation...");

    // 新規記録作成ボタンをクリック
    const newRecordButton = page.locator('button:has-text("新規記録")').first();
    await newRecordButton.waitFor({ state: "visible", timeout: 5000 });
    await newRecordButton.click();
    await page.waitForTimeout(500);

    // 活動を選択
    const activitySelector = page
      .locator('[role="option"]:has-text("テスト活動")')
      .first();
    await activitySelector.waitFor({ state: "visible", timeout: 5000 });
    await activitySelector.click();
    await page.waitForTimeout(500);

    // 数値とメモを入力
    await page.locator('input[type="number"]').fill("15");
    await page.locator('textarea[name="memo"]').fill("日次ページからの記録");

    // 記録ボタンをクリック
    await page.locator('button:has-text("記録")').click();
    await page.waitForTimeout(1000);

    // 記録が表示されることを確認
    const activityLog = page.locator("text=テスト活動").first();
    expect(await activityLog.isVisible()).toBe(true);

    console.log("Testing activity log update...");

    // 活動記録をクリックして編集
    await activityLog.click();
    await page.waitForTimeout(500);

    // 数値とメモを更新
    await page.locator('input[type="number"]').fill("20");
    await page.locator('textarea[name="memo"]').fill("更新されたメモ");

    // 更新ボタンをクリック
    await page.locator('button:has-text("更新")').click();
    await page.waitForTimeout(1000);

    // 更新された内容が表示されることを確認
    const updatedLog = page.locator("text=20").first();
    expect(await updatedLog.isVisible()).toBe(true);

    console.log("Testing activity log deletion...");

    // 再度活動記録をクリック
    await page.locator("text=テスト活動").first().click();
    await page.waitForTimeout(500);

    // 削除ボタンをクリック
    await page.locator('button:has-text("削除")').click();
    await page.waitForTimeout(500);

    // 確認ダイアログで削除を確認
    await page.locator('button:has-text("削除する")').click();
    await page.waitForTimeout(1000);

    // ========== 目標管理ページのテスト ==========
    console.log("\n========== Testing Goal Management Page ==========");

    // 目標管理の作成は活動が必要なため、スキップ
    console.log(
      "Note: Goal management test skipped due to activity creation dependency",
    );

    // 目標ページへ移動
    const goalNavLink = page.locator('a[href="/new-goal"]').first();
    if (await goalNavLink.isVisible()) {
      await goalNavLink.click();
      await page.waitForURL(/\/new-goal/, { timeout: 5000 });
    } else {
      await page.goto(`http://localhost:${actualFrontendPort}/new-goal`);
    }

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    console.log("Testing goal creation...");

    // 新規目標追加ボタンをクリック
    const addGoalButton = page.locator("text=新規目標");
    await addGoalButton.click();
    await page.waitForTimeout(500);

    // 活動を選択
    await page.locator("text=目標テスト活動").click();
    await page.waitForTimeout(500);

    // 目標値を入力
    await page.locator('input[name="targetValue"]').fill("100");
    await page.locator('input[name="targetValueType"]').fill("回");

    // 登録ボタンをクリック
    await page.locator('button:has-text("登録")').click();
    await page.waitForTimeout(1000);

    // 目標が表示されることを確認
    const createdGoal = page.locator("text=目標テスト活動").first();
    expect(await createdGoal.isVisible()).toBe(true);

    // ========== タスク管理ページのテスト ==========
    console.log("\n========== Testing Task Management Page ==========");

    // タスクページへ移動
    const taskNavLink = page.locator('a[href="/tasks"]').first();
    if (await taskNavLink.isVisible()) {
      await taskNavLink.click();
      await page.waitForURL(/\/tasks/, { timeout: 5000 });
    } else {
      await page.goto(`http://localhost:${actualFrontendPort}/tasks`);
    }

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    console.log("Testing task creation...");

    // 新規タスク追加ボタンをクリック
    const addTaskButton = page.locator("text=新規タスク").first();
    await addTaskButton.waitFor({ state: "visible", timeout: 5000 });
    await addTaskButton.click();
    await page.waitForTimeout(500);

    // タスク名と説明を入力
    await page.locator('input[name="title"]').fill("テストタスク");
    await page
      .locator('textarea[name="description"]')
      .fill("テストタスクの説明");

    // 登録ボタンをクリック
    await page.locator('button:has-text("登録")').click();
    await page.waitForTimeout(1000);

    // タスクが表示されることを確認
    const createdTask = page.locator("text=テストタスク").first();
    expect(await createdTask.isVisible()).toBe(true);

    // ========== 活動統計ページのテスト ==========
    console.log("\n========== Testing Activity Statistics Page ==========");

    // 統計ページへ移動
    await page.goto(`http://localhost:${actualFrontendPort}/activity/stats`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    console.log("Testing activity statistics...");

    // ページのコンテンツを確認
    const statsPageContent = await page.textContent("body");
    expect(statsPageContent).toContain("活動統計");

    // 月切り替えボタンの動作確認
    const prevMonthButton = page.locator('button[aria-label="前月"]');
    await prevMonthButton.click();
    await page.waitForTimeout(500);

    const nextMonthButton = page.locator('button[aria-label="翌月"]');
    await nextMonthButton.click();
    await page.waitForTimeout(500);

    // ========== 設定ページとログアウトのテスト ==========
    console.log("\n========== Testing Settings Page and Logout ==========");

    // 設定ページへ移動
    const settingNavLink = page.locator('a[href="/setting"]').first();
    if (await settingNavLink.isVisible()) {
      await settingNavLink.click();
      await page.waitForURL(/\/setting/, { timeout: 5000 });
    } else {
      await page.goto(`http://localhost:${actualFrontendPort}/setting`);
    }

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    console.log("Testing settings page...");

    // 設定項目が表示されることを確認
    const settingsPageContent = await page.textContent("body");
    expect(settingsPageContent).toContain("アカウント");

    // 起動時画面の設定を変更
    const startupCheckbox = page.locator('input[type="checkbox"]').first();
    await startupCheckbox.click();
    await page.waitForTimeout(500);

    // ログアウトボタンをクリック
    console.log("Testing logout...");
    const logoutButton = page.locator('button:has-text("ログアウト")');
    await logoutButton.click();

    // ログイン画面にリダイレクトされることを確認
    await page.waitForURL(/\/$/, { timeout: 5000 });
    const loginForm = page.locator("text=ログインID");
    expect(await loginForm.isVisible()).toBe(true);

    console.log("\n========== All tests completed successfully! ==========");
  }, 180000); // 3分のタイムアウト
});
