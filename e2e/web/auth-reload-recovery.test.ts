import type { BrowserContext, Page } from "playwright";
import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { BASE_URL } from "../helpers/config";
import { holdSuccessfulRefreshResponses } from "../setup/authResponseGate";

async function waitForSession(page: Page) {
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

async function refreshCookie(context: BrowserContext) {
  const cookie = (await context.cookies(BASE_URL)).find(
    (entry) => entry.name === "refresh_token",
  );
  if (!cookie)
    throw new Error("A logged-in session must have a refresh cookie");
  return cookie.value;
}

for (const engine of ["chromium", "firefox"] as const) {
  describe(`更新応答を受け取れない場合の復旧 (${engine})`, () => {
    const { getPage, getContext } = setupBrowser(engine);

    it("commit 後の応答ヘッダー受領前に 2 回リロードしてもログインを維持する", async () => {
      const page = getPage();
      const context = getContext();
      await login(page, "e2e@example.com", "password123");
      await waitForSession(page);
      const originalCookie = await refreshCookie(context);
      const gate = holdSuccessfulRefreshResponses(2);
      try {
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect.poll(() => gate.blockedCount).toBe(1);
        expect((await refreshCookie(context)) === originalCookie).toBe(true);

        await page.reload({ waitUntil: "domcontentloaded" });
        await expect.poll(() => gate.blockedCount).toBe(2);
        expect((await refreshCookie(context)) === originalCookie).toBe(true);

        const response = page.waitForResponse(
          (res) =>
            new URL(res.url()).pathname === "/auth/token" &&
            res.request().method() === "POST",
        );
        await page.reload({ waitUntil: "domcontentloaded" });
        expect((await response).status()).toBe(200);
        await waitForSession(page);
        await expect
          .poll(async () => page.locator("nav").isVisible())
          .toBe(true);
        expect(await page.locator("#loginId").isVisible()).toBe(false);
        expect((await refreshCookie(context)) === originalCookie).toBe(false);
      } finally {
        gate.dispose();
      }
    });

    it("Cookie 受領後に本文を失っても同じ更新を回復する", async () => {
      const page = getPage();
      const context = getContext();
      await login(page, "e2e@example.com", "password123");
      await waitForSession(page);
      const originalCookie = await refreshCookie(context);
      const gate = holdSuccessfulRefreshResponses(1, "body");
      try {
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect.poll(() => gate.blockedCount).toBe(1);
        await expect
          .poll(async () => (await refreshCookie(context)) === originalCookie)
          .toBe(false);
        const deliveredCookie = await refreshCookie(context);
        await page.reload({ waitUntil: "domcontentloaded" });
        await waitForSession(page);
        // The server re-delivers the same child; it must not rotate it again.
        expect((await refreshCookie(context)) === deliveredCookie).toBe(true);
        expect(await page.locator("#loginId").isVisible()).toBe(false);
      } finally {
        gate.dispose();
      }
    });

    it("新しい login Cookie の受領後に旧 proof の削除が失敗しても reload で復帰する", async () => {
      const page = getPage();
      await login(page, "e2e@example.com", "password123");
      await waitForSession(page);
      const setup = await page.evaluate<{
        pending: boolean;
        ready: boolean;
      }>(`(async () => {
        const { authController } = await import("/src/auth/authController.ts");
        const { newWebRefreshOperationStore } = await import("/src/auth/webRefreshOperationStore.ts");
        const removeItem = Storage.prototype.removeItem;
        Storage.prototype.removeItem = function(key) {
          if (key.startsWith("actiko:refresh-operation:")) {
            throw new Error("e2e-storage-clear-failure");
          }
          return removeItem.call(this, key);
        };
        await authController.reconcile();
        await authController.login("e2e@example.com", "password123");
        return {
          pending: newWebRefreshOperationStore(location.origin).read() !== null,
          ready: authController.getState().syncReady,
        };
      })()`);
      expect(setup).toEqual({ pending: true, ready: true });
      const statuses: number[] = [];
      page.on("response", (response) => {
        if (new URL(response.url()).pathname === "/auth/token") {
          statuses.push(response.status());
        }
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForSession(page);
      expect(statuses).toEqual([409, 200]);
      expect(await page.locator("#loginId").isVisible()).toBe(false);
      expect(await page.locator("nav").isVisible()).toBe(true);
    });
  });
}
