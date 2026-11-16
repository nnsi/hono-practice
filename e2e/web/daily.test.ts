import { describe, expect, it } from "vitest";

import {
  activityCard,
  createActivity,
  logRow,
  recordQuantity,
  recordsSection,
} from "../helpers/actiko";
import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";

// Daily 画面は Actiko 画面（/actiko）へ統合した。
// 旧 Daily の「その日の記録」は /actiko の「この日の記録」節で確認する。
describe("actiko: この日の記録", () => {
  const { getPage } = setupBrowser();

  it("記録履歴を確認できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // グリッドのシード済み「E2Eランニング」カードを押下して記録
    await recordQuantity(page, "E2Eランニング", "7");

    // 同じ画面の「この日の記録」に、アクティビティ名と数量が同じ行で表示される
    await logRow(page, "E2Eランニング", "7km")
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
  });

  it("日付を前後に切り替えられる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // 前日には無い記録を今日に作っておく
    await recordQuantity(page, "E2Eランニング", "33");
    const todayLog = logRow(page, "E2Eランニング", "33km").first();
    await todayLog.waitFor({ state: "visible", timeout: 15000 });

    // 今日の日付ピルが date-pill-today クラスを持つ
    await page.waitForSelector(".date-pill-today", { timeout: 15000 });
    const todayText = await page.locator(".date-pill-today").textContent();

    // 左矢印で前日へ（aria-label使用）
    await page.click('button[aria-label="前の日"]');

    // date-pill-today が消え、「この日の記録」が前日の内容に切り替わる
    await page.waitForSelector(".date-pill-today", {
      state: "detached",
      timeout: 15000,
    });
    await todayLog.waitFor({ state: "detached", timeout: 15000 });

    // 右矢印で当日に戻る（aria-label使用）
    await page.click('button[aria-label="次の日"]');
    await page.waitForSelector(".date-pill-today", { timeout: 15000 });

    const restoredText = await page.locator(".date-pill-today").textContent();
    expect(restoredText).toBe(todayText);
    await todayLog.waitFor({ state: "visible", timeout: 15000 });
  });

  it("記録するとこの日の記録とカードの合計に反映される", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // worker 内で DB を共有するため、合計が他テストの記録に左右されない専用アクティビティを使う
    const name = "合計確認活動";
    await createActivity(page, name, "回");
    const card = activityCard(page, name);

    // 未記録のカードは単位だけを出し、一覧にも行が無い
    expect(await card.innerText()).not.toMatch(/\d/);
    expect(
      await recordsSection(page)
        .getByRole("button")
        .filter({ hasText: name })
        .count(),
    ).toBe(0);

    // 1 件目: 一覧に行が出て、カードにその日の合計が出る
    await recordQuantity(page, name, "3");
    await logRow(page, name, "3回")
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
    await card
      .filter({ hasText: "3回" })
      .waitFor({ state: "visible", timeout: 15000 });

    // 2 件目: 一覧は 2 行になり、カードは合算値になる
    await recordQuantity(page, name, "4");
    await logRow(page, name, "4回")
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
    await card
      .filter({ hasText: "7回" })
      .waitFor({ state: "visible", timeout: 15000 });
    expect(
      await recordsSection(page)
        .getByRole("button")
        .filter({ hasText: name })
        .count(),
    ).toBe(2);
  });

  it("記録を編集できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await recordQuantity(page, "E2Eランニング", "21");

    const row = logRow(page, "E2Eランニング", "21km").first();
    await row.waitFor({ state: "visible", timeout: 15000 });
    await row.click();

    // EditLogDialog が開く
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });

    // 数量を変更
    const quantityInput = page.locator('.modal-backdrop input[type="number"]');
    await quantityInput.fill("25");

    // 保存
    await page.click('.modal-backdrop button:has-text("保存")');

    // ダイアログが閉じる
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });

    // 更新された数量が同じ行に表示される
    await logRow(page, "E2Eランニング", "25km")
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
  });

  it("記録を削除できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // 削除用の記録を先に作成
    await recordQuantity(page, "E2Eランニング", "99");

    // 99km の行が表示される
    const row = logRow(page, "E2Eランニング", "99km");
    await row.first().waitFor({ state: "visible", timeout: 15000 });

    // 該当の行をクリック
    await row.first().click();

    // EditLogDialog が開く
    await page.waitForSelector(".modal-backdrop", { timeout: 15000 });

    // 2段階削除: 赤ボーダーの「削除」→ 赤背景の「削除」
    await page.click(".modal-backdrop button.border-red-300");
    await page.click(".modal-backdrop button.bg-red-600");

    // ダイアログが閉じる
    await page.waitForSelector(".modal-backdrop", {
      state: "detached",
      timeout: 15000,
    });

    // 99km の行が消えている
    await row.first().waitFor({ state: "detached", timeout: 15000 });
  });
});
