import type { Page } from "playwright";

/**
 * タスク追加ダイアログを開く。
 * DB 状態によって「最初のタスクを作成」or「新規タスクを追加」のどちらかが表示される。
 * PGlite にタスクが残っている場合、同期完了まで表示が切り替わるため
 * or() で安定するまで待つ。
 */
export async function openTaskCreateDialog(page: Page) {
  const emptyBtn = page.locator('button:has-text("最初のタスクを作成")');
  const addBtn = page.locator('button:has-text("新規タスクを追加")');

  // どちらかが表示されるまで待つ
  await emptyBtn
    .or(addBtn)
    .first()
    .waitFor({ state: "visible", timeout: 15000 });

  // 同期完了で状態が切り替わる可能性があるためネットワーク安定を待つ
  await page.waitForLoadState("networkidle");

  // 非空状態のボタンを優先（同期後の安定状態）
  if (await addBtn.isVisible()) {
    await addBtn.click();
  } else {
    await emptyBtn.click();
  }
}
