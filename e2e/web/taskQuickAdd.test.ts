import type { Locator, Page } from "playwright";
import { describe, expect, it } from "vitest";

import { tasksSection } from "../helpers/actiko";
import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";

describe("タスクの画面内追加", () => {
  const { getPage } = setupBrowser();

  // Daily 画面は Actiko 画面へ統合したので、日付つきのクイック追加は /actiko のタスク節で確認する。
  // /actiko と /tasks は同じクイック追加フォームを持ち、遷移直後は遷移元の画面がまだ描画されている。
  // 遷移元のフォームに入力してしまわないよう、遷移先に固有の要素が出てからフォームを探す。
  const routes: { route: string; ready: (page: Page) => Locator }[] = [
    { route: "actiko", ready: (page) => tasksSection(page) },
    {
      route: "tasks",
      ready: (page) =>
        page.getByRole("button", { name: "アーカイブ済み", exact: true }),
    },
  ];

  it.each(routes)("$routeでダイアログを開かず連続追加して再表示できる", async ({
    route,
    ready,
  }) => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await page.click(`a[href="/${route}"]`);
    await ready(page).waitFor();
    const form = page.getByRole("form", { name: "タスクを追加", exact: true });
    const input = form.getByRole("textbox");
    const add = form.getByRole("button", { name: "追加", exact: true });
    await input.waitFor();
    expect(await add.isEnabled()).toBe(false);
    const title = `追加-${Date.now().toString(36)}`;
    await input.fill(title);
    await add.click();
    await page.getByText(title, { exact: true }).waitFor();
    expect(await input.inputValue()).toBe("");
    expect(
      await page.getByRole("heading", { name: "新しいタスクを作成" }).count(),
    ).toBe(0);
    const second = `${title}-2`;
    await input.fill(second);
    await input.press("Enter");
    await page.getByText(second, { exact: true }).waitFor();
    await page.reload();
    await page.getByText(title, { exact: true }).waitFor();
    await page.getByText(second, { exact: true }).waitFor();
  });
});
