import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";

describe("daily", () => {
  const { getPage } = setupBrowser();

  it("記録履歴を確認できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // ホーム（/actiko）でシード済み「E2Eランニング」カードを押下して記録
    await page.waitForSelector('text="E2Eランニング"', { timeout: 15000 });
    await page.click('text="E2Eランニング"');

    // RecordDialog が開く
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });

    // モーダル内の数量入力フィールドに記録
    const modal = page.locator(".modal-backdrop");
    const quantityInput = modal.locator('input[type="number"]');
    await quantityInput.fill("7");
    await modal.locator('button:has-text("記録する")').click();

    // ダイアログが閉じる
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });

    // Daily ページに遷移
    await page.click('a[href="/daily"]');
    await page.waitForURL("**/daily", { timeout: 15000 });

    // LogCard にアクティビティ名と数量が同じカード内に表示される
    const logCard = page
      .locator("button")
      .filter({ hasText: "E2Eランニング" })
      .filter({ hasText: "7km" });
    await logCard.first().waitFor({ state: "visible", timeout: 15000 });
  });

  it("日付を前後に切り替えられる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/daily"]');
    await page.waitForURL("**/daily", { timeout: 15000 });

    // 今日の日付ピルが date-pill-today クラスを持つ
    await page.waitForSelector(".date-pill-today", { timeout: 15000 });
    const todayText = await page.locator(".date-pill-today").textContent();

    // 左矢印で前日へ（aria-label使用）
    await page.click('button[aria-label="前の日"]');

    // date-pill-today が消え、日付テキストが変わる
    await page.waitForSelector(".date-pill-today", {
      state: "detached",
      timeout: 15000,
    });

    // 右矢印で当日に戻る（aria-label使用）
    await page.click('button[aria-label="次の日"]');
    await page.waitForSelector(".date-pill-today", { timeout: 15000 });

    const restoredText = await page.locator(".date-pill-today").textContent();
    expect(restoredText).toBe(todayText);
  });

  it("Dailyページから記録を作成できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/daily"]');
    await page.waitForURL("**/daily", { timeout: 15000 });

    // 「+ 追加」ボタンをクリック（アクティビティセクション内）
    const activitySection = page.locator("section").first();
    await activitySection
      .locator('button:has-text("追加")')
      .waitFor({ state: "visible", timeout: 15000 });
    await activitySection.locator('button:has-text("追加")').click();

    // CreateLogDialog: アクティビティ選択画面が開く
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });
    await page.waitForSelector('text="アクティビティを選択"', {
      timeout: 15000,
    });

    // 「E2Eランニング」を選択
    const modal = page.locator(".modal-backdrop");
    await modal.locator('button:has-text("E2Eランニング")').click();

    // ManualMode の数量入力（画面遷移を待つ）
    await modal
      .locator('input[type="number"]')
      .waitFor({ state: "visible", timeout: 15000 });
    await modal.locator('input[type="number"]').fill("15");

    // 記録する（モーダル内にスコープ）
    await modal.locator('button:has-text("記録する")').click();

    // ダイアログが閉じる
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });

    // 新しい記録が同カード内に表示される
    const newLog = page
      .locator("button")
      .filter({ hasText: "E2Eランニング" })
      .filter({ hasText: "15km" });
    await newLog.first().waitFor({ state: "visible", timeout: 15000 });
  });

  it("記録を編集できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('a[href="/daily"]');
    await page.waitForURL("**/daily", { timeout: 15000 });

    // ログが表示されるのを待つ
    await page
      .locator('text="E2Eランニング"')
      .first()
      .waitFor({ state: "visible", timeout: 15000 });

    // LogCard（E2Eランニングを含むbutton）をクリックして EditLogDialog を開く
    const logCard = page
      .locator("button")
      .filter({ hasText: "E2Eランニング" })
      .first();
    await logCard.click();

    // EditLogDialog が開く
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });

    // 数量を変更
    const quantityInput = page.locator('.modal-backdrop input[type="number"]');
    await quantityInput.fill("25");

    // 保存
    await page.click('.modal-backdrop button:has-text("保存")');

    // ダイアログが閉じる
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });

    // 更新された数量が同カード内に表示される
    const updatedLog = page
      .locator("button")
      .filter({ hasText: "E2Eランニング" })
      .filter({ hasText: "25km" });
    await updatedLog.first().waitFor({ state: "visible", timeout: 15000 });
  });

  it("記録を削除できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // 削除用の記録を先に作成
    await page.waitForSelector('text="E2Eランニング"', { timeout: 15000 });
    await page.click('text="E2Eランニング"');
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });
    const modal = page.locator(".modal-backdrop");
    await modal.locator('input[type="number"]').fill("99");
    await modal.locator('button:has-text("記録する")').click();
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });

    // Daily ページに遷移
    await page.click('a[href="/daily"]');
    await page.waitForURL("**/daily", { timeout: 15000 });

    // 99km のログが表示される（カード内にスコープ）
    const logCard = page
      .locator("button")
      .filter({ hasText: "E2Eランニング" })
      .filter({ hasText: "99km" });
    await logCard.first().waitFor({ state: "visible", timeout: 15000 });

    // 該当の LogCard をクリック
    await logCard.first().click();

    // EditLogDialog が開く
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });

    // 2段階削除: ゴミ箱ボタン（aria-label="削除"） → 確認ボタン（aria-label="削除を確認"）
    await page.click('.modal-backdrop button[aria-label="削除"]');
    await page.click('.modal-backdrop button[aria-label="削除を確認"]');

    // ダイアログが閉じる
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });

    // 99km のカードが消えている
    await logCard.first().waitFor({ state: "detached", timeout: 15000 });
  });
});
