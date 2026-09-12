import type { Page } from "playwright";

/** 同期で空状態が切り替わっても、現在表示されている作成ボタンをクリックする。 */
export async function openTaskCreateDialog(page: Page) {
  await page
    .getByRole("button", {
      name: /^(最初のタスクを作成|新規タスクを追加)$/,
    })
    .click();
}
