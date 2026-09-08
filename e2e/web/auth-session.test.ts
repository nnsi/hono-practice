import type { Page } from "playwright";
import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { BASE_URL } from "../helpers/config";

// Vite 経由の実際の controller を確認し、hydrate の即時表示だけで成功としない。
async function waitForSession(page: Page) {
  // 文字列で渡し、Vitest の SSR 変換がブラウザ側の import を書き換えないようにする。
  await expect
    .poll(
      () =>
        page.evaluate<boolean>(
          'import("/src/auth/authController.ts").then(({ authController }) => authController.getState().syncReady)',
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
}

describe("認証セッションの継続", () => {
  const { getPage, getContext } = setupBrowser();

  it("トークン検証失敗後、Cookie で更新して元の API を再送する", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await waitForSession(page);
    const refreshStatuses: number[] = [];
    page.on("response", (res) => {
      if (new URL(res.url()).pathname === "/auth/token")
        refreshStatuses.push(res.status());
    });
    const status = await page.evaluate<number>(`(async () => {
      const { tokenHolder } = await import("/src/api/tokenHolder.ts");
      const { customFetch } = await import("/src/api/customFetch.ts");
      tokenHolder.setToken("invalid-access-token");
      return (await customFetch(location.origin + "/user/me")).status;
    })()`);
    expect(status).toBe(200);
    expect(refreshStatuses).toEqual([200]);
    expect(await page.locator("nav").isVisible()).toBe(true);
  });

  it("起動時の 429 でもログインを維持し、制限解除後に復旧できる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await waitForSession(page);
    await page.clock.install();
    await page.route("**/auth/token", (route) =>
      route.fulfill({ status: 429, body: "rate limited" }),
    );
    const limited = page.waitForResponse(
      (res) =>
        new URL(res.url()).pathname === "/auth/token" && res.status() === 429,
    );
    await page.reload();
    await limited;
    await page.waitForSelector("nav");
    expect(await page.locator("#loginId").count()).toBe(0);
    await page.unroute("**/auth/token");
    await page.clock.runFor(1_001);
    await waitForSession(page);
  });

  it("3 タブの同時起動でも全てのセッションを復元できる", async () => {
    const page = getPage();
    const context = getContext();
    await login(page, "e2e@example.com", "password123");
    await waitForSession(page);
    const tabs = [page, await context.newPage(), await context.newPage()];
    const refreshStatuses: number[] = [];
    context.on("response", (res) => {
      if (new URL(res.url()).pathname === "/auth/token")
        refreshStatuses.push(res.status());
    });
    await Promise.all(tabs.map((tab) => tab.goto(BASE_URL)));
    await Promise.all(tabs.map(waitForSession));
    expect(refreshStatuses).toHaveLength(3);
    expect(refreshStatuses.every((status) => status === 200)).toBe(true);
    for (const tab of tabs)
      expect(await tab.locator("nav").isVisible()).toBe(true);
  });
});
