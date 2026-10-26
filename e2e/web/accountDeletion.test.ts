import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { BASE_URL } from "../helpers/config";
import { navigateToSettings } from "../helpers/settings";

describe("account deletion", () => {
  const { getPage } = setupBrowser();
  it("confirms deletion at 375px, reports completion, then rejects login", async () => {
    const page = getPage();
    await page.setViewportSize({ width: 375, height: 812 });
    const loginId = `delete-${crypto.randomUUID()}`;
    const create = await page.request.post(`${BASE_URL}/user`, {
      data: {
        loginId,
        password: "password123",
        consents: { age: true, terms: "2026-09-30", privacy: "2026-10-26" },
      },
    });
    expect(create.ok()).toBe(true);
    await page.context().clearCookies();
    await login(page, loginId, "password123");
    await navigateToSettings(page);
    await page
      .getByRole("button", { name: "アカウントを削除", exact: true })
      .click();
    expect(
      await page.getByText("削除を確定すると、", { exact: false }).isVisible(),
    ).toBe(true);
    await page.route("**/user/me", (route) =>
      route.request().method() === "DELETE"
        ? route.fulfill({ status: 503, body: "unavailable" })
        : route.continue(),
    );
    await page.getByRole("button", { name: "削除する", exact: true }).click();
    await page
      .getByText("アカウント削除に失敗しました。", { exact: false })
      .waitFor();
    expect(page.url()).toContain("/settings");
    await page.unroute("**/user/me");
    const dialogPromise = page.waitForEvent("dialog");
    const responsePromise = page.waitForResponse(
      (r) => r.url().endsWith("/user/me") && r.request().method() === "DELETE",
    );
    await page
      .getByRole("button", { name: "削除する", exact: true })
      .press("Enter");
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain("退会処理が完了しました");
    expect((await responsePromise).status()).toBe(200);
    await dialog.accept();
    await page.locator("#loginId").waitFor({ state: "visible" });
    const retry = await page.request.post(`${BASE_URL}/auth/login`, {
      data: { login_id: loginId, password: "password123" },
    });
    expect(retry.status()).toBe(401);
  });
});
