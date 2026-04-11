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

async function createNote(page: Page, title: string, content: string) {
  await openNewNote(page);
  await page.fill('input[placeholder="ノートのタイトル"]', title);
  await page.fill(
    'textarea[placeholder="内容（Markdownに対応しています）"]',
    content,
  );
}

describe("notes", () => {
  const { getPage } = setupBrowser();

  it("ノートを作成してプレビューしながら保存できる", async () => {
    const page = getPage();
    const title = "E2Eノート作成";
    const content = `# ${title}\n作成したノートの本文です。`;

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);

    await page.fill('input[placeholder="ノートのタイトル"]', title);
    await page.fill(
      'textarea[placeholder="内容（Markdownに対応しています）"]',
      content,
    );

    await page.waitForFunction(() => {
      const select = document.querySelector("select");
      return !!select && select.querySelectorAll("option").length > 1;
    });
    await page.locator("select").selectOption({ index: 1 });

    await page.click('button[aria-label="プレビュー"]');
    await page.locator("textarea").waitFor({ state: "detached", timeout: 15000 });
    await page.waitForSelector(`text="${title}"`, { timeout: 15000 });
    await page.waitForSelector('text="作成したノートの本文です。"', {
      timeout: 15000,
    });

    await page.click('button:has-text("保存")');
    await page.waitForURL("**/notes", { timeout: 15000 });
    await page.waitForSelector(`text="${title}"`, { timeout: 15000 });

    await page.locator("button").filter({ hasText: title }).first().click();
    await page.waitForURL("**/notes/*", { timeout: 15000 });
    await page.waitForSelector('text="作成したノートの本文です。"', {
      timeout: 15000,
    });
  });

  it("編集中に戻ると変更破棄を確認できて、そのまま保存できる", async () => {
    const page = getPage();
    const originalTitle = "E2Eノート編集前";
    const updatedTitle = "E2Eノート編集後";
    const updatedContent = "未保存の編集内容を保持したまま保存します。";

    await login(page, "e2e@example.com", "password123");
    await createNote(page, originalTitle, "初版の内容です。");
    await page.click('button:has-text("保存")');
    await page.waitForURL("**/notes", { timeout: 15000 });

    await page.locator("button").filter({ hasText: originalTitle }).first().click();
    await page.waitForURL("**/notes/*", { timeout: 15000 });

    await page.click('button[aria-label="ノートを編集"]');
    await page.click('button[aria-label="設定"]');

    const titleInput = page.locator('input[placeholder="ノートのタイトル"]');
    const contentInput = page.locator(
      'textarea[placeholder="内容（Markdownに対応しています）"]',
    );

    await titleInput.fill(updatedTitle);
    await contentInput.fill(updatedContent);

    await page.click('button:has-text("戻る")');
    await page.waitForSelector('text="変更を破棄しますか？"', {
      timeout: 15000,
    });

    await page.click('button:has-text("編集を続ける")');
    expect(await titleInput.inputValue()).toBe(updatedTitle);
    expect(await contentInput.inputValue()).toBe(updatedContent);

    await page.click('button:has-text("保存")');
    await page.waitForSelector(`text="${updatedTitle}"`, { timeout: 15000 });

    await page.click('button:has-text("戻る")');
    await page.waitForURL("**/notes", { timeout: 15000 });
    await page.waitForSelector(`text="${updatedTitle}"`, { timeout: 15000 });
  });

  it("ノートを一覧から削除できる", async () => {
    const page = getPage();
    const title = "E2Eノート削除";

    await login(page, "e2e@example.com", "password123");
    await createNote(page, title, "削除対象のノートです。");
    await page.click('button:has-text("保存")');
    await page.waitForURL("**/notes", { timeout: 15000 });

    const noteButton = page.locator("button").filter({ hasText: title }).first();
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
