import { describe, expect, it } from "vitest";

import { E2E_USER_ID } from "../../scripts/seedDevData";
import { login } from "../helpers/auth";
import { setupBrowser } from "../helpers/browser";
import { BACKEND_PORT } from "../helpers/config";

const API_URL = `http://localhost:${BACKEND_PORT}`;
const RC_AUTH_KEY = "rc_e2e_test_key";

async function sendRevenueCatWebhook(
  eventType: string,
  userId: string,
  providerId = "txn_e2e_test",
) {
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
        id: `evt_${Date.now()}`,
        original_transaction_id: providerId,
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000,
      },
    }),
  });
  return res;
}

async function getDexiePlan(page: import("playwright").Page): Promise<string> {
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

  it("/user/me が plan フィールドを返し Dexie にキャッシュされる", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // seed で premium subscription が入っているので premium のはず
    const plan = await getDexiePlan(page);
    expect(plan).toBe("premium");
  });

  it("Webhook で plan が free に変わりリロード後に反映される", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // 初期状態: premium
    expect(await getDexiePlan(page)).toBe("premium");

    // EXPIRATION webhook → free に
    const res = await sendRevenueCatWebhook(
      "EXPIRATION",
      E2E_USER_ID,
      "sub_e2e_test",
    );
    expect(res.status).toBe(200);

    // リロードで /user/me から新しい plan を取得
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("nav", { timeout: 15000 });

    expect(await getDexiePlan(page)).toBe("free");
  });

  it("Webhook で plan が premium に戻る", async () => {
    const page = getPage();
    await login(page, "e2e@example.com", "password123");

    // 前テストで free になっている
    expect(await getDexiePlan(page)).toBe("free");

    // INITIAL_PURCHASE webhook → premium に
    const res = await sendRevenueCatWebhook(
      "INITIAL_PURCHASE",
      E2E_USER_ID,
      "sub_e2e_test",
    );
    expect(res.status).toBe(200);

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("nav", { timeout: 15000 });

    expect(await getDexiePlan(page)).toBe("premium");
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
