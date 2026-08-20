import { afterEach, describe, expect, it } from "vitest";

import { E2E_USER_ID } from "../../scripts/seedDevData";
import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { BACKEND_PORT, BASE_URL } from "../helpers/config";

const API_URL = `http://localhost:${BACKEND_PORT}`;
const RC_AUTH_KEY = "rc_e2e_test_key";
const RC_PROVIDER_ID = "sub_e2e_test";
let webhookSequence = 0;

async function sendRevenueCatWebhook(
  eventType: string,
  userId: string,
  providerId = RC_PROVIDER_ID,
) {
  webhookSequence += 1;
  const occurredAt = Date.now() + webhookSequence;
  const res = await fetch(`${API_URL}/webhooks/revenuecat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RC_AUTH_KEY}`,
    },
    body: JSON.stringify({
      event: {
        type: eventType,
        app_user_id: userId,
        id: `evt_entitlement_${occurredAt}_${webhookSequence}`,
        original_transaction_id: providerId,
        expiration_at_ms: occurredAt + 30 * 24 * 60 * 60 * 1000,
        event_timestamp_ms: occurredAt,
      },
    }),
  });
  return res;
}

async function arrangeEntitlement(
  eventType: "EXPIRATION" | "INITIAL_PURCHASE",
) {
  const response = await sendRevenueCatWebhook(eventType, E2E_USER_ID);
  expect(response.status).toBe(200);
}

async function waitForDexiePlan(
  page: import("playwright").Page,
  expected: string,
  timeoutMs = 5000,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const plan = await page.evaluate(() => {
      return new Promise<string>((resolve, reject) => {
        const request = indexedDB.open("actiko");
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("authState", "readonly");
          const store = tx.objectStore("authState");
          const getReq = store.get("current");
          getReq.onsuccess = () => resolve(getReq.result?.plan ?? "none");
          getReq.onerror = () => reject(getReq.error);
        };
        request.onerror = () => reject(request.error);
      });
    });
    if (plan === expected) return plan;
    await page.waitForTimeout(300);
  }
  // タイムアウト: 最終値を返す
  return page.evaluate(() => {
    return new Promise<string>((resolve, reject) => {
      const request = indexedDB.open("actiko");
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("authState", "readonly");
        const store = tx.objectStore("authState");
        const getReq = store.get("current");
        getReq.onsuccess = () => resolve(getReq.result?.plan ?? "none");
        getReq.onerror = () => reject(getReq.error);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

describe("entitlement", () => {
  const { getPage } = setupBrowser();

  afterEach(async () => {
    await arrangeEntitlement("INITIAL_PURCHASE");
  });

  it("/user/me が plan フィールドを返し Dexie にキャッシュされる", async () => {
    await arrangeEntitlement("INITIAL_PURCHASE");
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    const plan = await waitForDexiePlan(page, "premium");
    expect(plan).toBe("premium");
  });

  it("Webhook で plan が free に変わりリロード後に反映される", async () => {
    await arrangeEntitlement("INITIAL_PURCHASE");
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // 初期状態: premium
    expect(await waitForDexiePlan(page, "premium")).toBe("premium");

    // EXPIRATION webhook → free に
    await arrangeEntitlement("EXPIRATION");

    // リロードで /user/me から新しい plan を取得
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("nav", { timeout: 15000 });

    expect(await waitForDexiePlan(page, "free")).toBe("free");
  });

  it("Webhook で plan が premium に戻る", async () => {
    await arrangeEntitlement("EXPIRATION");
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    expect(await waitForDexiePlan(page, "free")).toBe("free");

    // INITIAL_PURCHASE webhook → premium に
    await arrangeEntitlement("INITIAL_PURCHASE");

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("nav", { timeout: 15000 });

    expect(await waitForDexiePlan(page, "premium")).toBe("premium");
  });

  it("production相当flagでFreeユーザーにWeb checkout導線を表示する", async () => {
    await arrangeEntitlement("EXPIRATION");
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState("networkidle");
    await page.reload({ waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: /アップグレード/ })
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });
  });

  it("不正な認証キーで 401 が返る", async () => {
    const res = await fetch(`${API_URL}/webhooks/revenuecat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer wrong_key",
      },
      body: JSON.stringify({
        event: { type: "INITIAL_PURCHASE", app_user_id: "x", id: "1" },
      }),
    });
    expect(res.status).toBe(401);
  });
});
