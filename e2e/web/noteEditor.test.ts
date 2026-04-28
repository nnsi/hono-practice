import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import {
  getNoteEditor,
  openNewNote,
  pasteMarkdownIntoNoteEditor,
  setNoteEditorHtml,
} from "../helpers/note";

function isOutsideInline(
  html: string,
  tag: "code" | "strong",
  nextText: string,
) {
  const normalized = html.replaceAll("&nbsp;", " ");
  const closeIndex = normalized.indexOf(`</${tag}>`);
  const nextIndex = normalized.indexOf(nextText);
  return closeIndex >= 0 && nextIndex > closeIndex;
}

describe("note editor markdown input", () => {
  const { getPage } = setupBrowser();

  it("Markdown pasteでlist/code/tableをeditor HTMLに変換できる", async () => {
    const page = getPage();

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);

    const editor = getNoteEditor(page);
    await pasteMarkdownIntoNoteEditor(
      editor,
      [
        "# Paste Heading",
        "",
        "- one",
        "- two",
        "",
        "`inline` and **bold**",
        "",
        "```",
        "const answer = 42;",
        "```",
        "",
        "| A | B |",
        "| --- | --- |",
        "| alpha | beta |",
      ].join("\n"),
    );

    await editor.locator("h1").waitFor({ state: "visible", timeout: 15000 });
    await expect.poll(() => editor.locator("li").count()).toBe(2);
    await editor.locator("pre code").waitFor({ state: "visible" });
    await editor.locator("table").waitFor({ state: "visible" });

    expect(await editor.locator("h1").textContent()).toBe("Paste Heading");
    expect(await editor.locator("li").allTextContents()).toEqual([
      "one",
      "two",
    ]);
    expect(await editor.locator("p code").textContent()).toBe("inline");
    expect(await editor.locator("strong").textContent()).toBe("bold");
    expect((await editor.locator("pre code").textContent())?.trimEnd()).toBe(
      "const answer = 42;",
    );
    expect(await editor.locator("th").allTextContents()).toEqual(["A", "B"]);
    expect(await editor.locator("td").allTextContents()).toEqual([
      "alpha",
      "beta",
    ]);
  });

  it("inline styleの末尾から右矢印とタップで外へ出られる", async () => {
    const page = getPage();

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);

    const editor = getNoteEditor(page);
    await setNoteEditorHtml(editor, "<p><strong>bold</strong></p>", "strong");
    await editor.evaluate((element) => {
      element.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "ArrowRight",
        }),
      );
    });
    await editor.pressSequentially(" after");

    const strongExitHtml = await editor.evaluate(
      (element) => element.innerHTML,
    );
    expect(isOutsideInline(strongExitHtml, "strong", "after")).toBe(true);

    await setNoteEditorHtml(editor, "<p><code>code</code></p>", "code");
    const codeBox = await editor.locator("code").boundingBox();
    expect(codeBox).not.toBeNull();
    await page.mouse.click(
      codeBox!.x + codeBox!.width - 2,
      codeBox!.y + codeBox!.height / 2,
    );
    await editor.pressSequentially(" next");

    const codeExitHtml = await editor.evaluate((element) => element.innerHTML);
    expect(isOutsideInline(codeExitHtml, "code", "next")).toBe(true);
  });

  it("code blockはShift+Enterで改行し、空行のEnterで通常段落へ出る", async () => {
    const page = getPage();

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);

    const editor = getNoteEditor(page);
    await setNoteEditorHtml(editor, "<pre><code>one</code></pre>", "code");

    await editor.press("Shift+Enter");
    await editor.pressSequentially("two");
    await editor.press("Enter");
    await editor.press("Enter");
    await editor.pressSequentially("after");

    expect(await editor.locator("pre code").textContent()).toBe("one\ntwo");
    expect(await editor.locator("p").last().textContent()).toContain("after");
  });

  it("**bold**変換後の続きはstrongの外に入る", async () => {
    const page = getPage();

    await login(page, "e2e@example.com", "password123");
    await openNewNote(page);

    const editor = getNoteEditor(page);
    await setNoteEditorHtml(editor, "<p>**bold**</p>");
    await editor.locator("strong").waitFor({ state: "visible" });
    await editor.pressSequentially(" after");

    const html = await editor.evaluate((element) => element.innerHTML);
    expect(isOutsideInline(html, "strong", "after")).toBe(true);
  });
});
