import type { Locator, Page } from "playwright";

export async function openNotes(page: Page) {
  await page.click('button[aria-label="Menu"]');
  await page.click('a:has-text("Notes")');
  await page.waitForURL("**/notes", { timeout: 15000 });
}

export async function openNewNote(page: Page) {
  await openNotes(page);
  await page.click('button[aria-label="ノートを作成"]');
  await page.waitForURL("**/notes/new", { timeout: 15000 });
  await page
    .locator('input[placeholder="ノートのタイトル"]')
    .waitFor({ state: "visible", timeout: 15000 });
}

export function getNoteEditor(page: Page) {
  return page.frameLocator('iframe[title="内容"]').locator("#editor");
}

export async function setNoteEditorHtml(
  editor: Locator,
  html: string,
  selector = "p",
) {
  await editor.evaluate(
    (element, { html, selector }) => {
      element.innerHTML = html;
      const target = element.querySelector(selector) || element;
      const textNode =
        target.firstChild && target.firstChild.nodeType === Node.TEXT_NODE
          ? target.firstChild
          : target;
      const range = document.createRange();
      range.setStart(textNode, textNode.textContent?.length || 0);
      range.collapse(true);

      const selection = document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      element.focus();
      element.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          data: "",
          inputType: "insertText",
        }),
      );
    },
    { html, selector },
  );
}

export async function pasteMarkdownIntoNoteEditor(
  editor: Locator,
  markdown: string,
) {
  await editor.evaluate((element, markdown) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/plain", markdown);

    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer,
      }),
    );
  }, markdown);
}

// 自動保存UI: 「戻る」が未保存分を flush してから一覧へ遷移する
export async function backFromNote(page: Page) {
  await page.click('button:has-text("戻る")');
  await page.waitForURL("**/notes", { timeout: 15000 });
}

export async function waitForNoteSaved(page: Page) {
  await page.waitForSelector('text="保存済み"', { timeout: 15000 });
}
