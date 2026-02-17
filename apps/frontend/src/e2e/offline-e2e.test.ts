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

describe.sequential("Offline E2E Tests", () => {
  let browser: Browser;
  let page: Page;
  let context: any;
  const TEST_BACKEND_PORT = 3463;
  let actualFrontendPort: number;

  const testUser = {
    loginId: "offlinetest",
    password: "Offline123!",
    name: "Offline Test User",
  };

  beforeAll(async () => {
    actualFrontendPort = await startTestFrontend(5178, TEST_BACKEND_PORT);
    await startTestBackend(TEST_BACKEND_PORT, actualFrontendPort);

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      acceptDownloads: true,
      ignoreHTTPSErrors: true,
      baseURL: `http://localhost:${actualFrontendPort}`,
      viewport: { width: 1280, height: 720 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    page = await context.newPage();

    const db = getTestDb();
    await resetTestDb(db);

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

  // OfflineToggle のボタンを title 属性で特定するヘルパー
  const offlineToggle = {
    clickGoOffline: async () => {
      await page.locator('button[title*="オンライン"]').click();
      await page.waitForSelector('button[title*="オフライン"]', {
        timeout: 5000,
      });
    },
    clickGoOnline: async () => {
      await page.locator('button[title*="オフライン"]').click();
      await page.waitForSelector('button[title*="オンライン"]', {
        timeout: 5000,
      });
    },
    isOffline: () =>
      page.locator('button[title*="オフライン"]').isVisible({ timeout: 1000 }),
    isOnline: () =>
      page.locator('button[title*="オンライン"]').isVisible({ timeout: 1000 }),
  };

  it("should handle offline activity log and sync on reconnect", async () => {
    // ========== ユーザー登録 ==========
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
    await page.waitForTimeout(2000);

    // トークンが保存されたことを確認
    const token = await page.evaluate(() =>
      localStorage.getItem("actiko-access-token"),
    );
    expect(token).toBeTruthy();

    // /actiko にリダイレクトされることを確認
    await page.waitForTimeout(2000);
    expect(page.url()).toContain("/actiko");

    // ========== アクティビティ作成 ==========
    await page.getByText("新規追加").click();
    await page.waitForSelector('[role="dialog"]', { state: "visible" });

    const nameInput = page.locator('input[placeholder="名前"]');
    await nameInput.fill("テスト活動");

    const unitInput = page.locator('input[placeholder*="単位"]');
    await unitInput.fill("回");

    await page.locator('button[type="submit"]:has-text("登録")').click();
    await page.waitForSelector('[role="dialog"]', {
      state: "hidden",
      timeout: 5000,
    });
    await page.waitForTimeout(1000);

    // アクティビティが表示されることを確認
    const activityCard = page.locator("text=テスト活動").first();
    expect(await activityCard.isVisible()).toBe(true);

    // ========== オンラインで記録 ==========
    await activityCard.click();
    await page.waitForTimeout(500);

    const numberInput = page.locator('input[type="number"]').first();
    if ((await numberInput.count()) > 0) {
      await numberInput.fill("5");
    }

    await page
      .locator('button:has-text("Record it!")')
      .first()
      .click();
    await page.waitForTimeout(1500);

    // ========== オフラインに切替 ==========
    await offlineToggle.clickGoOffline();

    // ========== オフラインで記録（楽観的更新） ==========
    const activityCardOffline = page.locator("text=テスト活動").first();
    await activityCardOffline.click();
    await page.waitForTimeout(500);

    const numberInputOffline = page.locator('input[type="number"]').first();
    if ((await numberInputOffline.count()) > 0) {
      await numberInputOffline.fill("10");
    }

    await page
      .locator('button:has-text("Record it!")')
      .first()
      .click();
    await page.waitForTimeout(1500);

    // ========== Dailyページに遷移（アプリ内ナビゲーション） ==========
    // page.goto はフルリロードでオフライン状態がリセットされるため、リンククリックで遷移
    await page.locator('a[href="/daily"]').click();
    await page.waitForTimeout(2000);

    // 2件のログが表示されることを確認
    const logEntries = page.locator("text=テスト活動");
    const logCount = await logEntries.count();
    expect(logCount).toBeGreaterThanOrEqual(2);

    // 5回と10回のログが表示されていることを確認
    const pageText = await page.textContent("body");
    expect(pageText).toContain("5回");
    expect(pageText).toContain("10回");

    // ========== オンラインに復帰 ==========
    await offlineToggle.clickGoOnline();
    await page.waitForTimeout(3000);

    // ログが引き続き表示されていることを確認（同期完了）
    const logEntriesAfterSync = page.locator("text=テスト活動");
    const logCountAfterSync = await logEntriesAfterSync.count();
    expect(logCountAfterSync).toBeGreaterThanOrEqual(2);

    const pageTextAfterSync = await page.textContent("body");
    expect(pageTextAfterSync).toContain("5回");
    expect(pageTextAfterSync).toContain("10回");

    console.log("Offline activity log test passed!");
  }, 120000);

  it("should handle offline task creation and sync on reconnect", async () => {
    // ========== Tasksページに移動 ==========
    await page.goto(`http://localhost:${actualFrontendPort}/tasks`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // ========== オフラインに切替 ==========
    await offlineToggle.clickGoOffline();

    // ========== オフラインでタスク作成 ==========
    await page.locator("text=新規タスクを追加").click();
    await page.waitForSelector('[role="dialog"]', { state: "visible" });

    await page.locator('input[name="title"]').fill("オフラインタスク");

    await page
      .locator('button:has-text("作成")')
      .first()
      .click();
    await page.waitForTimeout(1500);

    // タスクが表示されることを確認（楽観的更新）
    const taskEntry = page.locator("text=オフラインタスク").first();
    expect(await taskEntry.isVisible()).toBe(true);

    // ========== オンラインに復帰 ==========
    await offlineToggle.clickGoOnline();
    await page.waitForTimeout(3000);

    // タスクが引き続き表示されていることを確認（同期完了）
    const taskEntryAfterSync = page.locator("text=オフラインタスク").first();
    expect(await taskEntryAfterSync.isVisible()).toBe(true);

    console.log("Offline task creation test passed!");
  }, 120000);
});
