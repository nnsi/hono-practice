import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";

describe("タスクの画面内追加", () => {
  const { getPage } = setupBrowser();

  it.each([
    "daily",
    "tasks",
  ])("%sでダイアログを開かず連続追加して再表示できる", async (route) => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await page.click(`a[href="/${route}"]`);
    const form = page.getByRole("form", { name: "タスクを追加", exact: true });
    const input = form.getByRole("textbox");
    const add = form.getByRole("button", { name: "追加", exact: true });
    await input.waitFor();
    expect(await add.isEnabled()).toBe(false);
    const title = `画面内追加-${route}-${Date.now()}`;
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
