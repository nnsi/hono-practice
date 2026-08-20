import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import {
  backFromNote,
  getNoteEditor,
  openNewNote,
  pasteMarkdownIntoNoteEditor,
} from "../helpers/note";

describe("note markdown persistence", () => {
  const { getPage } = setupBrowser();

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
