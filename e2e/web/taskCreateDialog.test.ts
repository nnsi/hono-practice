import { expect, it } from "vitest";

import { setupBrowser } from "../helpers/browser";
import { openTaskCreateDialog } from "../helpers/task";

const { getPage } = setupBrowser();

it("同期で空状態ボタンがクリック中に置き換わっても作成ダイアログを開く", async () => {
  const page = getPage();
  page.setDefaultTimeout(2000);
  await page.setContent('<button type="button">最初のタスクを作成</button>');
  await page.evaluate(() => {
    const emptyButton = document.querySelector("button")!;
    // Playwright がクリック対象へ移動した時点で同期完了の DOM 更新を再現する。
    emptyButton.addEventListener("pointerover", () => {
      const addButton = document.createElement("button");
      addButton.textContent = "新規タスクを追加";
      addButton.addEventListener("click", () => {
        const dialog = document.createElement("dialog");
        dialog.textContent = "タスクを作成";
        document.body.append(dialog);
        dialog.showModal();
      });
      emptyButton.replaceWith(addButton);
    });
  });

  await openTaskCreateDialog(page);

  expect(await page.getByRole("dialog").textContent()).toBe("タスクを作成");
});
