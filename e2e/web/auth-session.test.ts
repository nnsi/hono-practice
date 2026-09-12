import { authDiagnosticReportSchema } from "@packages/types/authDiagnostics";
import type { BrowserContext, Page, Response } from "playwright";
import { describe, expect, it } from "vitest";

import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { BASE_URL } from "../helpers/config";

const INVALID_ACCESS_TOKEN = "e2e-private-invalid-access-token";
const INVALID_REFRESH_TOKEN = "e2e-private-invalid-refresh-token";

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

async function invalidateRefreshCookie(page: Page, context: BrowserContext) {
  const session = await page.evaluate<{
    accessToken: string | null;
    userId: string | null;
  }>(`(async () => {
    const { tokenHolder } = await import("/src/api/tokenHolder.ts");
    const { authController } = await import("/src/auth/authController.ts");
    const { webAuthDiagnostics } = await import("/src/auth/webAuthDiagnostics.ts");
    await webAuthDiagnostics.flush();
    return {
      accessToken: tokenHolder.getToken(),
      userId: authController.getState().userId,
    };
  })()`);
  expect(session.accessToken).toBeTruthy();
  expect(session.userId).toBeTruthy();
  const cookie = (await context.cookies(BASE_URL)).find(
    (entry) => entry.name === "refresh_token",
  );
  if (!cookie) throw new Error("A successful login must set a refresh cookie");
  await context.addCookies([{ ...cookie, value: INVALID_REFRESH_TOKEN }]);
  return {
    ...session,
    refreshToken: cookie.value,
    invalidAccessToken: INVALID_ACCESS_TOKEN,
    invalidRefreshToken: INVALID_REFRESH_TOKEN,
    loginId: "e2e@example.com",
    password: "password123",
  };
}

function waitForSessionClearedReport(
  page: Page,
  source: "api_401" | "bootstrap",
) {
  return page.waitForResponse((response) => {
    if (
      new URL(response.url()).pathname !== "/client-errors" ||
      response.request().method() !== "POST"
    ) {
      return false;
    }
    const body = response.request().postDataJSON();
    return (
      body?.errorType === "auth_diagnostic" &&
      body.diagnostic?.trigger?.event === "session_cleared" &&
      body.diagnostic.trigger.source === source
    );
  });
}

async function expectExpiredSessionReport(
  reportResponse: Response,
  refreshResponse: Response,
  source: "api_401" | "bootstrap",
  secrets: Record<string, string | null>,
) {
  expect(reportResponse.status()).toBe(204);
  const request = reportResponse.request();
  const body = request.postDataJSON();
  expect(body).toMatchObject({
    errorType: "auth_diagnostic",
    message: "Auth session diagnostic",
    platform: "web",
  });
  const report = authDiagnosticReportSchema.parse(body.diagnostic);
  // Schema parsing must not silently discard an extra sensitive field.
  expect(report).toEqual(body.diagnostic);
  expect(
    Object.keys(body).filter(
      (key) =>
        ![
          "errorType",
          "message",
          "platform",
          "appVersion",
          "diagnostic",
        ].includes(key),
    ),
  ).toEqual([]);
  expect(report.trigger).toMatchObject({
    event: "session_cleared",
    reason: "refresh_expired",
    source,
    wasLoggedIn: true,
  });
  const requestId = await refreshResponse.headerValue("X-Request-ID");
  expect(requestId).toMatch(/^[a-f0-9-]{8,36}$/);
  expect(
    report.breadcrumbs.find(
      (entry) =>
        entry.event === "refresh_result" && entry.requestId === requestId,
    ),
  ).toMatchObject({
    reason: "http_401",
    source: "refresh",
    status: 401,
    requestId,
    attempt: 1,
  });
  expect(
    await refreshResponse.request().headerValue("X-Auth-Diagnostic-Id"),
  ).toBe(report.flowId);
  expect(await request.headerValue("Authorization")).toBeNull();
  expect(await request.headerValue("Cookie")).toBeNull();
  const serialized = request.postData() ?? "";
  for (const [label, secret] of Object.entries(secrets)) {
    if (secret) {
      expect(serialized.includes(secret), `diagnostic leaked ${label}`).toBe(
        false,
      );
    }
  }
  return report;
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

  it("API の 401 で再認証できない場合、ログイン画面と相関可能な診断ログを残す", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await waitForSession(page);
    const secrets = await invalidateRefreshCookie(page, getContext());
    const rejectedRefresh = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/auth/token" &&
        response.status() === 401,
    );
    const diagnostic = waitForSessionClearedReport(page, "api_401");
    const status = await page.evaluate<number>(`(async () => {
      const { tokenHolder } = await import("/src/api/tokenHolder.ts");
      const { customFetch } = await import("/src/api/customFetch.ts");
      tokenHolder.setToken(${JSON.stringify(INVALID_ACCESS_TOKEN)});
      return (await customFetch(location.origin + "/user/me")).status;
    })()`);
    expect(status).toBe(401);
    await page.locator("#loginId").waitFor({ state: "visible" });
    await expectExpiredSessionReport(
      await diagnostic,
      await rejectedRefresh,
      "api_401",
      secrets,
    );
  });

  it("起動時に Cookie が無効でも、直前のログイン履歴を含む終端診断を送信する", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");
    await waitForSession(page);
    const secrets = await invalidateRefreshCookie(page, getContext());
    const rejectedRefresh = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/auth/token" &&
        response.status() === 401,
    );
    const diagnostic = waitForSessionClearedReport(page, "bootstrap");
    await page.reload();
    await page.locator("#loginId").waitFor({ state: "visible" });
    const report = await expectExpiredSessionReport(
      await diagnostic,
      await rejectedRefresh,
      "bootstrap",
      secrets,
    );
    expect(report.breadcrumbs).toContainEqual(
      expect.objectContaining({
        event: "hydrate",
        reason: "local_session_present",
        source: "bootstrap",
        hasLocalUser: true,
        hasLastLogin: true,
        lastLoginAgeMs: expect.any(Number),
      }),
    );
  });
});
