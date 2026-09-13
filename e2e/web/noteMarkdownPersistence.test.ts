import { randomUUID } from "node:crypto";

import { request } from "playwright";
import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { BASE_URL } from "../helpers/config";
import {
  backFromNote,
  getNoteEditor,
  openNewNote,
  openNotes,
  pasteMarkdownIntoNoteEditor,
} from "../helpers/note";

describe("note markdown persistence", () => {
  const { getPage } = setupBrowser();

  it("アプリ形式の単一改行を同期後の Web 表示・編集・再読み込みで保持する", async () => {
    const title = `Mobile newline ${Date.now()}`;
    const api = await request.newContext({ baseURL: BASE_URL });
    try {
      const auth = await api.post("/auth/login", {
        data: { login_id: "e2e@example.com", password: "password123" },
      });
      expect(auth.ok()).toBe(true);
      const { token } = await auth.json();
      const now = new Date().toISOString();
      const sync = await api.post("/users/v2/notes/sync", {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          notes: [
            {
              id: randomUUID(),
              title,
              content: "1行目\n2行目",
              activityId: null,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            },
          ],
        },
      });
      expect(sync.ok()).toBe(true);
    } finally {
      await api.dispose();
    }
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await openNotes(page);
    await page.getByRole("heading", { name: title, exact: true }).click();
    const editor = getNoteEditor(page);
    await expect.poll(() => editor.innerText()).toBe("1行目\n2行目");
    expect(await editor.locator("br").count()).toBe(1);
    await page.setViewportSize({ width: 375, height: 812 });
    await editor.press("ControlOrMeta+a");
    await editor.press("ArrowRight");
    await editor.pressSequentially(" 追記");
    await backFromNote(page);
    await page.getByRole("heading", { name: title, exact: true }).click();
    await page.reload();
    await expect.poll(() => editor.innerText()).toBe("1行目\n2行目 追記");
  });

  it("Markdownで書いたnoteを保存し、再表示してもmarkupが維持される", async () => {
    const page = getPage();
    const title = `E2E Markdown保存 ${Date.now()}`;

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);

    await page.fill('input[placeholder="ノートのタイトル"]', title);

    const editor = getNoteEditor(page);
    await pasteMarkdownIntoNoteEditor(
      editor,
      [
        "# Saved Heading",
        "",
        "- one",
        "- two",
        "",
        "`inline` and **bold**",
        "",
        "```",
        "const saved = true;",
        "```",
        "",
        "| A | B |",
        "| --- | --- |",
        "| alpha | beta |",
      ].join("\n"),
    );

    await editor.locator("table").waitFor({ state: "visible", timeout: 15000 });

    // 自動保存: 戻る操作で flush されて一覧に反映される
    await backFromNote(page);
    await page.waitForSelector(`text="${title}"`, { timeout: 15000 });
    await page
      .locator("button")
      .filter({ hasText: title })
      .filter({ hasText: "Saved Heading" })
      .first()
      .waitFor({ state: "visible", timeout: 15000 });

    await page.locator("button").filter({ hasText: title }).first().click();
    await page.waitForURL("**/notes/*", { timeout: 15000 });

    const reopenedEditor = getNoteEditor(page);
    await reopenedEditor
      .locator("h1")
      .waitFor({ state: "visible", timeout: 15000 });
    await reopenedEditor.locator("table").waitFor({ state: "visible" });

    expect(await reopenedEditor.locator("h1").textContent()).toBe(
      "Saved Heading",
    );
    expect(await reopenedEditor.locator("li").allTextContents()).toEqual([
      "one",
      "two",
    ]);
    expect(await reopenedEditor.locator("p code").textContent()).toBe("inline");
    expect(await reopenedEditor.locator("strong").textContent()).toBe("bold");
    expect(
      (await reopenedEditor.locator("pre code").textContent())?.trimEnd(),
    ).toBe("const saved = true;");
    expect(await reopenedEditor.locator("th").allTextContents()).toEqual([
      "A",
      "B",
    ]);
    expect(await reopenedEditor.locator("td").allTextContents()).toEqual([
      "alpha",
      "beta",
    ]);
  });
});
