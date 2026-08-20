import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { backFromNote, openNewNote, waitForNoteSaved } from "../helpers/note";

describe("notes", () => {
  const { getPage } = setupBrowser();

  it("新規ノートを作成して一覧に表示される", async () => {
    const page = getPage();
    const title = "E2Eノート作成";

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);

    await page.fill('input[placeholder="ノートのタイトル"]', title);

    // 自動保存: 戻る操作で flush されて一覧に反映される
    await backFromNote(page);
    await page.waitForSelector(`text="${title}"`, { timeout: 15000 });
  });

  it("既存ノートのタイトルをインラインで編集できる", async () => {
    const page = getPage();
    const originalTitle = "E2Eノート編集前";
    const updatedTitle = "E2Eノート編集後";

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);
    await page.fill('input[placeholder="ノートのタイトル"]', originalTitle);
    await backFromNote(page);
    await page.waitForSelector(`text="${originalTitle}"`, { timeout: 15000 });

    // 一覧でノートを開く（タイトル入力は常時インライン表示）
    await page
      .locator("button")
      .filter({ hasText: originalTitle })
      .first()
      .click();
    await page.waitForURL("**/notes/*", { timeout: 15000 });

    const titleInput = page.locator('input[placeholder="ノートのタイトル"]');
    await titleInput.waitFor({ state: "visible", timeout: 15000 });
    await titleInput.fill(updatedTitle);

    await backFromNote(page);
    await page.waitForSelector(`text="${updatedTitle}"`, { timeout: 15000 });
  });

  it("編集内容は明示的な保存なしで自動保存される", async () => {
    const page = getPage();
    const originalTitle = "E2Eノート自動保存前";
    const updatedTitle = "E2Eノート自動保存後";

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);
    await page.fill('input[placeholder="ノートのタイトル"]', originalTitle);
    await backFromNote(page);
    await page.waitForSelector(`text="${originalTitle}"`, { timeout: 15000 });

    await page
      .locator("button")
      .filter({ hasText: originalTitle })
      .first()
      .click();
    await page.waitForURL("**/notes/*", { timeout: 15000 });

    const titleInput = page.locator('input[placeholder="ノートのタイトル"]');
    await titleInput.waitFor({ state: "visible", timeout: 15000 });
    await titleInput.fill(updatedTitle);

    // 「保存済み」インジケータが出るまで待ち、リロードしても変更が残っている
    await waitForNoteSaved(page);
    await page.reload();
    const reloadedInput = page.locator('input[placeholder="ノートのタイトル"]');
    await reloadedInput.waitFor({ state: "visible", timeout: 15000 });
    expect(await reloadedInput.inputValue()).toBe(updatedTitle);
  });

  it("ノートを一覧から削除できる", async () => {
    const page = getPage();
    const title = "E2Eノート削除";

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);
    await page.fill('input[placeholder="ノートのタイトル"]', title);
    await backFromNote(page);
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
