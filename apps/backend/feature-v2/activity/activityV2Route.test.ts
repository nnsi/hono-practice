import { Hono } from "hono";

import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { describe, expect, test } from "vitest";

import { activityV2Route } from ".";

const SEED_ACTIVITY_ID_1 = "00000000-0000-4000-8000-000000000001";
const SEED_ACTIVITY_ID_2 = "00000000-0000-4000-8000-000000000002";
const SEED_ACTIVITY_ID_3 = "00000000-0000-4000-8000-000000000003";
const SEED_KIND_ID_1 = "00000000-0000-4000-8000-000000000001";
const SEED_KIND_ID_2 = "00000000-0000-4000-8000-000000000002";

const NOW = new Date().toISOString();

function makeActivity(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    name: "New Activity",
    label: "",
    emoji: "🎯",
    iconType: "emoji" as const,
    iconUrl: null,
    iconThumbnailUrl: null,
    description: "",
    quantityUnit: "",
    orderIndex: "zzz",
    showCombinedStats: true,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function makeKind(overrides: Record<string, unknown> = {}) {
  return {
    id: "10000000-0000-4000-8000-100000000001",
    activityId: SEED_ACTIVITY_ID_1,
    name: "New Kind",
    color: null,
    orderIndex: "a",
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function createApp() {
  return new Hono().use(mockAuthMiddleware).route("/users/v2", activityV2Route);
}

async function postSync(
  app: ReturnType<typeof createApp>,
  body: Record<string, unknown>,
) {
  return app.request(
    "/users/v2/activities/sync",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { DB: testDB },
  );
}

async function getActivities(app: ReturnType<typeof createApp>) {
  return app.request("/users/v2/activities", { method: "GET" }, { DB: testDB });
}

describe("POST /users/v2/activities/sync", () => {
  test("新規アクティビティとkindの同期", async () => {
    const app = createApp();
    const newActivity = makeActivity();
    const newKind = makeKind({
      activityId: newActivity.id,
    });

    const res = await postSync(app, {
      activities: [newActivity],
      activityKinds: [newKind],
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.activities.syncedIds).toContain(newActivity.id);
    // kind の activityId は新規activity → 所有権チェックでownedになるはず
    // 注意: kindの所有権チェックはupsert後のactivityを含むため新規activityも対象
    expect(json.activityKinds.syncedIds).toContain(newKind.id);
  });

  test("既存アクティビティの更新 (LWW - クライアント勝利)", async () => {
    const app = createApp();
    const futureDate = new Date(Date.now() + 60 * 1000).toISOString();
    const updatedActivity = makeActivity({
      id: SEED_ACTIVITY_ID_1,
      name: "Updated name",
      emoji: "🏃",
      updatedAt: futureDate,
    });

    const res = await postSync(app, {
      activities: [updatedActivity],
      activityKinds: [],
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.activities.syncedIds).toContain(SEED_ACTIVITY_ID_1);
    expect(json.activities.serverWins).toHaveLength(0);
  });

  test("serverWins - サーバー側が新しい場合", async () => {
    const app = createApp();
    const oldActivity = makeActivity({
      id: SEED_ACTIVITY_ID_1,
      name: "old name",
      emoji: "🏃",
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const res = await postSync(app, {
      activities: [oldActivity],
      activityKinds: [],
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.activities.syncedIds).not.toContain(SEED_ACTIVITY_ID_1);
    expect(json.activities.serverWins).toHaveLength(1);
    expect(json.activities.serverWins[0].id).toBe(SEED_ACTIVITY_ID_1);
  });

  test("activityKinds所有権チェック - 他人のactivityIdはskip", async () => {
    const app = createApp();
    const kind = makeKind({
      activityId: "99999999-9999-4999-9999-999999999999",
    });

    const res = await postSync(app, {
      activities: [],
      activityKinds: [kind],
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.activityKinds.skippedIds).toContain(kind.id);
    expect(json.activityKinds.syncedIds).toHaveLength(0);
  });

  test("既存kindの更新 (LWW - クライアント勝利)", async () => {
    const app = createApp();
    const futureDate = new Date(Date.now() + 60 * 1000).toISOString();
    const updatedKind = makeKind({
      id: SEED_KIND_ID_1,
      activityId: SEED_ACTIVITY_ID_1,
      name: "Updated Kind",
      updatedAt: futureDate,
    });

    const res = await postSync(app, {
      activities: [],
      activityKinds: [updatedKind],
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.activityKinds.syncedIds).toContain(SEED_KIND_ID_1);
    expect(json.activityKinds.serverWins).toHaveLength(0);
  });

  test("既存kindのserverWins", async () => {
    const app = createApp();
    const oldKind = makeKind({
      id: SEED_KIND_ID_1,
      activityId: SEED_ACTIVITY_ID_1,
      name: "old kind",
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const res = await postSync(app, {
      activities: [],
      activityKinds: [oldKind],
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.activityKinds.syncedIds).not.toContain(SEED_KIND_ID_1);
    expect(json.activityKinds.serverWins).toHaveLength(1);
    expect(json.activityKinds.serverWins[0].id).toBe(SEED_KIND_ID_1);
  });

  test("バリデーションエラー - 不正なペイロード", async () => {
    const app = createApp();
    const res = await postSync(app, {
      activities: [{ id: "not-a-uuid" }],
      activityKinds: [],
    });
    expect(res.status).toBe(400);
  });

  test("バリデーションエラー - activityKindsキー欠損", async () => {
    const app = createApp();
    const res = await postSync(app, {
      activities: [],
    });
    expect(res.status).toBe(400);
  });

  test("max 100 activities バリデーション - 101件で400", async () => {
    const app = createApp();
    const acts = Array.from({ length: 101 }, (_, i) =>
      makeActivity({
        id: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        name: `Activity ${i}`,
      }),
    );

    const res = await postSync(app, {
      activities: acts,
      activityKinds: [],
    });
    expect(res.status).toBe(400);
  });

  test("max 100 activities バリデーション - ちょうど100件でOK", async () => {
    const app = createApp();
    const acts = Array.from({ length: 100 }, (_, i) =>
      makeActivity({
        id: `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        name: `Activity ${i}`,
      }),
    );

    const res = await postSync(app, {
      activities: acts,
      activityKinds: [],
    });
    expect(res.status).toBe(200);
  });
});

describe("GET /users/v2/activities", () => {
  test("全件取得 - activities + kinds", async () => {
    const app = createApp();
    const res = await getActivities(app);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.activities).toHaveLength(3);

    const activityIds = json.activities.map((a: { id: string }) => a.id);
    expect(activityIds).toContain(SEED_ACTIVITY_ID_1);
    expect(activityIds).toContain(SEED_ACTIVITY_ID_2);
    expect(activityIds).toContain(SEED_ACTIVITY_ID_3);

    // activity 0001 に紐づく 2つの kinds
    expect(json.activityKinds).toHaveLength(2);
    const kindIds = json.activityKinds.map((k: { id: string }) => k.id);
    expect(kindIds).toContain(SEED_KIND_ID_1);
    expect(kindIds).toContain(SEED_KIND_ID_2);
  });
});
