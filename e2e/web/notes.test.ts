import type { Page } from "playwright";
import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";

async function openNotes(page: Page) {
  await page.click('button[aria-label="Menu"]');
  await page.click('a:has-text("Notes")');
  await page.waitForURL("**/notes", { timeout: 15000 });
}

async function openNewNote(page: Page) {
  await openNotes(page);
  await page.click('button[aria-label="ノートを作成"]');
  await page.waitForURL("**/notes/new", { timeout: 15000 });
  await page
    .locator('input[placeholder="ノートのタイトル"]')
    .waitFor({ state: "visible", timeout: 15000 });
}

async function saveNote(page: Page) {
  await page.click('button:has-text("保存")');
}

describe("notes", () => {
  const { getPage } = setupBrowser();

  it("新規ノートを作成して一覧に表示される", async () => {
    const page = getPage();
    const title = "E2Eノート作成";

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);

    await page.fill('input[placeholder="ノートのタイトル"]', title);

    await saveNote(page);

    // 一覧に戻り、タイトルが表示される
    await page.waitForURL("**/notes", { timeout: 15000 });
    await page.waitForSelector(`text="${title}"`, { timeout: 15000 });
  });

  it("既存ノートのタイトルを編集できる", async () => {
    const page = getPage();
    const originalTitle = "E2Eノート編集前";
    const updatedTitle = "E2Eノート編集後";

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);
    await page.fill('input[placeholder="ノートのタイトル"]', originalTitle);
    await saveNote(page);
    await page.waitForURL("**/notes", { timeout: 15000 });
    await page.waitForSelector(`text="${originalTitle}"`, { timeout: 15000 });

    // 一覧でノートを開く
    await page
      .locator("button")
      .filter({ hasText: originalTitle })
      .first()
      .click();
    await page.waitForURL("**/notes/*", { timeout: 15000 });

    // 設定パネルを開く（初期状態は折り畳み）
    await page.click('button[aria-label="設定"]');
    const titleInput = page.locator('input[placeholder="ノートのタイトル"]');
    await titleInput.waitFor({ state: "visible", timeout: 15000 });

    await titleInput.fill(updatedTitle);
    await saveNote(page);

    // 保存後、一覧に戻って新タイトルが表示される
    await page.click('button:has-text("戻る")');
    await page.waitForURL("**/notes", { timeout: 15000 });
    await page.waitForSelector(`text="${updatedTitle}"`, { timeout: 15000 });
  });

  it("編集中に戻ろうとすると破棄ダイアログで中断できる", async () => {
    const page = getPage();
    const originalTitle = "E2Eノート中断";
    const draftTitle = "E2Eノート未保存";

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);
    await page.fill('input[placeholder="ノートのタイトル"]', originalTitle);
    await saveNote(page);
    await page.waitForURL("**/notes", { timeout: 15000 });
    await page.waitForSelector(`text="${originalTitle}"`, { timeout: 15000 });

    await page
      .locator("button")
      .filter({ hasText: originalTitle })
      .first()
      .click();
    await page.waitForURL("**/notes/*", { timeout: 15000 });

    // 設定パネルを開いてタイトル変更（未保存）
    await page.click('button[aria-label="設定"]');
    const titleInput = page.locator('input[placeholder="ノートのタイトル"]');
    await titleInput.waitFor({ state: "visible", timeout: 15000 });
    await titleInput.fill(draftTitle);

    // 戻るをクリックすると破棄バーが出現
    await page.click('button:has-text("戻る")');
    await page.waitForSelector('text="変更を破棄しますか？"', {
      timeout: 15000,
    });

    // 「編集を続ける」で破棄バーが閉じ、未保存値は残っている
    await page.click('button:has-text("編集を続ける")');
    expect(await titleInput.inputValue()).toBe(draftTitle);
  });

  it("ノートを一覧から削除できる", async () => {
    const page = getPage();
    const title = "E2Eノート削除";

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);
    await page.fill('input[placeholder="ノートのタイトル"]', title);
    await saveNote(page);
    await page.waitForURL("**/notes", { timeout: 15000 });
    await page.waitForSelector(`text="${title}"`, { timeout: 15000 });

    const noteButton = page
      .locator("button")
      .filter({ hasText: title })
      .first();
    const noteCard = noteButton.locator(
      "xpath=ancestor::div[contains(@class, 'rounded-xl')][1]",
    );

    await noteButton.waitFor({ state: "visible", timeout: 15000 });
    await noteCard.waitFor({ state: "visible", timeout: 15000 });
    await noteCard.locator('button[aria-label="ノートを削除"]').click();

    await page.waitForSelector('text="このノートを削除しますか？"', {
      timeout: 15000,
    });
    await page.click('button:has-text("削除する")');

    await noteButton.waitFor({ state: "detached", timeout: 15000 });
  });
});
