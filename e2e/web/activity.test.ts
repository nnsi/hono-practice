import { describe, expect, it } from "vitest";

import {
  actikoCard,
  expandActikoCard,
  expandedActikoCard,
  waitForActikoCardCollapsed,
} from "../helpers/actiko";
import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";

describe("activity", () => {
  const { getPage } = setupBrowser();

  it("アクティビティを作成できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.click('button:has-text("追加")');
    await page.fill('input[placeholder="アクティビティ名"]', "E2Eテスト活動");
    await page.fill('input[placeholder="回, 分, km など"]', "回");
    await page.click('button:has-text("作成")');

    await page.waitForSelector('text="E2Eテスト活動"', { timeout: 15000 });
  });

  it("カードをその場で展開して記録できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // シード済み「E2Eランニング」カードを押下するとモーダルではなくカードが展開する
    const card = await expandActikoCard(page, "E2Eランニング");
    expect(await page.locator(".modal-backdrop").count()).toBe(0);

    // 展開したカード内の数量入力フィールドに記録
    await card.locator('input[type="number"]').fill("10");
    await card.locator('button:has-text("記録する")').click();

    // 保存後にカードが折りたたまれ、記録済み表示になる
    await waitForActikoCardCollapsed(page, "E2Eランニング");
    await actikoCard(page, "E2Eランニング")
      .locator("button.activity-done")
      .waitFor({ state: "visible", timeout: 15000 });
  });

  it("チェックモードはカードのタップだけで記録され、取り消せる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // Kind なしのチェック活動を作成
    await page.click('button:has-text("追加")');
    await page.fill('input[placeholder="アクティビティ名"]', "E2E即時チェック");
    await page.click('.modal-backdrop button:has-text("チェック")');
    await page.click('button:has-text("作成")');
    const card = actikoCard(page, "E2E即時チェック");
    await card.waitFor({ state: "visible", timeout: 15000 });

    // 1 タップで記録され、モーダルも展開も出ない
    await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await card.locator("button").first().click();
    await card
      .locator("button.activity-done")
      .waitFor({ state: "visible", timeout: 15000 });
    expect(await page.locator(".modal-backdrop").count()).toBe(0);
    expect(await expandedActikoCard(page, "E2E即時チェック").count()).toBe(0);

    // 猶予中の「取り消す」で未記録に戻る
    await card.locator('button:has-text("取り消す")').click();
    await card
      .locator("button.activity-done")
      .waitFor({ state: "detached", timeout: 15000 });
  });

  it("アクティビティを編集できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // 編集用にアクティビティを新規作成（シード済みデータを壊さない）
    await page.click('button:has-text("追加")');
    await page.fill('input[placeholder="アクティビティ名"]', "編集対象活動");
    await page.fill('input[placeholder="回, 分, km など"]', "回");
    await page.click('button:has-text("作成")');
    await page.waitForSelector('text="編集対象活動"', { timeout: 15000 });

    // カードの鉛筆アイコンをクリック
    const card = page
      .locator("div.relative.group")
      .filter({ hasText: "編集対象活動" })
      .first();
    await card.locator("button.absolute").click();

    // 編集ダイアログが開く
    await page.waitForSelector('text="アクティビティ編集"', { timeout: 15000 });

    // 名前を変更
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill("編集済み活動");
    await page.click('button:has-text("保存")');

    // 更新後の名前が表示される
    await page.waitForSelector('text="編集済み活動"', { timeout: 15000 });
  });

  it("アクティビティを削除できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // 削除用にアクティビティを新規作成
    await page.click('button:has-text("追加")');
    await page.fill('input[placeholder="アクティビティ名"]', "削除対象活動");
    await page.fill('input[placeholder="回, 分, km など"]', "回");
    await page.click('button:has-text("作成")');
    await page.waitForSelector('text="削除対象活動"', { timeout: 15000 });

    // 編集ダイアログを開く
    const card = page
      .locator("div.relative.group")
      .filter({ hasText: "削除対象活動" })
      .first();
    await card.locator("button.absolute").click();
    await page.waitForSelector('text="アクティビティ編集"', { timeout: 15000 });

    // 2段階確認で削除（赤ボーダーの「削除」→ 赤背景の「本当に削除」）
    await page.click("button.border-red-300");
    await page.click("button.bg-red-600");

    // ダイアログが閉じ、アクティビティが消える（Dexie liveQuery の伝播を待つ）
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });
    await page.waitForSelector('text="削除対象活動"', {
      state: "detached",
      timeout: 15000,
    });
  });
});
