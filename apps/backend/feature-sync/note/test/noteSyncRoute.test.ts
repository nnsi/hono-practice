import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { notes } from "@infra/drizzle/schema";
import type { UpsertNoteRequest } from "@packages/types";
import { describe, expect, test } from "vitest";

import { createNoteSyncRoute } from "..";

const NOW = new Date().toISOString();

function makeNote(
  overrides: Partial<UpsertNoteRequest> = {},
): UpsertNoteRequest {
  return {
    id: crypto.randomUUID(),
    activityId: null,
    title: "Test Note",
    content: "# Hello\nThis is a test note.",
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...overrides,
  };
}

function createApp() {
  return newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/users/v2", createNoteSyncRoute());
}

async function postSync(
  app: ReturnType<typeof createApp>,
  body: Record<string, unknown>,
) {
  return app.request(
    "/users/v2/notes/sync",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { DB: testDB },
  );
}

async function getNotes(app: ReturnType<typeof createApp>, query = "") {
  return app.request(
    `/users/v2/notes${query ? `?${query}` : ""}`,
    { method: "GET" },
    { DB: testDB },
  );
}

describe("GET /users/v2/notes", () => {
  test("空の場合は { notes: [] } を返す", async () => {
    const app = createApp();
    const res = await getNotes(app);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.notes).toHaveLength(0);
  });

  test("since パラメータでフィルタリング", async () => {
    const app = createApp();

    // まずノートを同期
    const note = makeNote();
    await postSync(app, { notes: [note] });

    // 未来の日時を指定 → 結果は0件
    const res = await getNotes(app, "since=2099-01-01T00:00:00.000Z");
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.notes).toHaveLength(0);
  });

  test("since以降の変更のみ返す", async () => {
    const app = createApp();

    const note = makeNote();
    await postSync(app, { notes: [note] });

    // 過去の日時を指定 → 同期したノートが返る
    const res = await getNotes(app, "since=2000-01-01T00:00:00.000Z");
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.notes.length).toBeGreaterThanOrEqual(1);
    const ids = json.notes.map((n: { id: string }) => n.id);
    expect(ids).toContain(note.id);
  });
});

describe("POST /users/v2/notes/sync", () => {
  test("新規ノート同期", async () => {
    const app = createApp();
    const note = makeNote();

    const res = await postSync(app, { notes: [note] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toContain(note.id);
    expect(json.serverWins).toHaveLength(0);
    expect(json.skippedIds).toHaveLength(0);
  });

  test("client新しい → client wins", async () => {
    const app = createApp();

    // まず同期してサーバーにノートを作成
    const note = makeNote();
    await postSync(app, { notes: [note] });

    // より新しいupdatedAtで更新
    const futureDate = new Date(Date.now() + 60 * 1000).toISOString();
    const updatedNote = makeNote({
      id: note.id,
      title: "Updated Title",
      content: "Updated content",
      updatedAt: futureDate,
    });

    const res = await postSync(app, { notes: [updatedNote] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toContain(note.id);
    expect(json.serverWins).toHaveLength(0);
  });

  test("server新しい → server wins", async () => {
    const app = createApp();

    // まず同期してサーバーにノートを作成
    const note = makeNote();
    await postSync(app, { notes: [note] });

    // 古いupdatedAtで更新を試みる
    const oldNote = makeNote({
      id: note.id,
      title: "Old Title",
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const res = await postSync(app, { notes: [oldNote] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).not.toContain(note.id);
    expect(json.serverWins).toHaveLength(1);
    expect(json.serverWins[0].id).toBe(note.id);
  });

  test("未来時刻のノート → skippedIds", async () => {
    const app = createApp();
    const farFuture = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const note = makeNote({ updatedAt: farFuture });

    const res = await postSync(app, { notes: [note] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.skippedIds).toContain(note.id);
    expect(json.syncedIds).not.toContain(note.id);
  });

  test("不正なactivityId → skippedIds", async () => {
    const app = createApp();
    const note = makeNote({
      activityId: "99999999-9999-4999-9999-999999999999",
    });

    const res = await postSync(app, { notes: [note] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.skippedIds).toContain(note.id);
    expect(json.syncedIds).not.toContain(note.id);
  });

  test("有効なactivityIdを持つノートの同期", async () => {
    const app = createApp();

    // seed dataの activity を使用
    const seedActivityId = "00000000-0000-4000-8000-000000000001";
    const note = makeNote({ activityId: seedActivityId });

    const res = await postSync(app, { notes: [note] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toContain(note.id);
    expect(json.skippedIds).toHaveLength(0);
  });

  test("deletedAt付きで同期（soft delete）", async () => {
    const app = createApp();

    // まず同期してサーバーにノートを作成
    const note = makeNote();
    await postSync(app, { notes: [note] });

    // deletedAtを付けて再同期
    const futureDate = new Date(Date.now() + 60 * 1000).toISOString();
    const deletedNote = makeNote({
      id: note.id,
      updatedAt: futureDate,
      deletedAt: futureDate,
    });

    const res = await postSync(app, { notes: [deletedNote] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toContain(note.id);

    // GET で取得して deletedAt が設定されていることを確認
    const getRes = await getNotes(app);
    const getJson = await getRes.json();
    const synced = getJson.notes.find((n: { id: string }) => n.id === note.id);
    expect(synced).toBeDefined();
    expect(synced.deletedAt).not.toBeNull();
  });

  test("空配列の同期", async () => {
    const app = createApp();
    const res = await postSync(app, { notes: [] });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.syncedIds).toHaveLength(0);
    expect(json.serverWins).toHaveLength(0);
    expect(json.skippedIds).toHaveLength(0);
  });

  test("バリデーションエラー - notesキー欠損", async () => {
    const app = createApp();
    const res = await postSync(app, {});
    expect(res.status).toBe(400);
  });

  test("max 100 バリデーション - 101件で400", async () => {
    const app = createApp();
    const noteList = Array.from({ length: 101 }, () => makeNote());

    const res = await postSync(app, { notes: noteList });
    expect(res.status).toBe(400);
  });
});

describe("clock skew handling - 時計が遅いケース", () => {
  test("新規ノートのupdatedAtがNOW()に引き上がりpull可能", async () => {
    const app = createApp();
    const beforePush = new Date(Date.now() - 1000).toISOString();

    const note = makeNote({
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { notes: [note] });
    expect(pushRes.status).toBe(200);
    expect((await pushRes.json()).syncedIds).toContain(note.id);

    // fix-up により updatedAt >= NOW() → beforePush 以降の since で取得可能
    const pullRes = await getNotes(app, `since=${beforePush}`);
    const pullJson = await pullRes.json();
    expect(pullJson.notes.map((n: { id: string }) => n.id)).toContain(note.id);
  });

  test("既存ノートの更新でupdatedAtがGREATESTで引き上がりpull可能", async () => {
    const app = createApp();
    const noteId = crypto.randomUUID();

    // DB直接挿入: fix-upを経由しない既知のupdatedAtを持つレコード
    await testDB.insert(notes).values({
      id: noteId,
      userId: TEST_USER_ID,
      title: "Original",
      content: "",
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      updatedAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const beforeUpdate = new Date(Date.now() - 1000).toISOString();

    // DBより新しいがNOW()より古い updatedAt で更新（時計遅れを再現）
    const clockBehindTime = "2023-06-01T00:00:00.000Z";
    const updatedNote = makeNote({
      id: noteId,
      title: "Updated from slow-clock device",
      updatedAt: clockBehindTime,
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { notes: [updatedNote] });
    const pushJson = await pushRes.json();
    // LWW: DB(2020) < client(2023) → client wins
    expect(pushJson.syncedIds).toContain(noteId);

    // SET GREATEST(2023, NOW()) = NOW() → pull可能
    const pullRes = await getNotes(app, `since=${beforeUpdate}`);
    const pullJson = await pullRes.json();
    const found = pullJson.notes.find((n: { id: string }) => n.id === noteId);
    expect(found).toBeDefined();
    expect(found.title).toBe("Updated from slow-clock device");
  });

  test("古い更新はserver winsを維持（LWW不変）", async () => {
    const app = createApp();

    const note = makeNote({ title: "Server version" });
    await postSync(app, { notes: [note] });

    const oldNote = makeNote({
      id: note.id,
      title: "Old client version",
      updatedAt: "2020-01-01T00:00:00.000Z",
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { notes: [oldNote] });
    const pushJson = await pushRes.json();
    expect(pushJson.syncedIds).not.toContain(note.id);
    expect(pushJson.serverWins).toHaveLength(1);
    expect(pushJson.serverWins[0].title).toBe("Server version");
  });
});

describe("clock skew handling - 時計が早いケース", () => {
  test("5分以内の新規ノートが同期・pull可能", async () => {
    const app = createApp();
    const threeMinAhead = new Date(Date.now() + 3 * 60 * 1000).toISOString();

    const note = makeNote({ updatedAt: threeMinAhead });

    const pushRes = await postSync(app, { notes: [note] });
    const pushJson = await pushRes.json();
    expect(pushJson.syncedIds).toContain(note.id);
    expect(pushJson.skippedIds).toHaveLength(0);

    // updatedAt > NOW() なので since=NOW でも取得可能
    const pullRes = await getNotes(app, `since=${NOW}`);
    const pullJson = await pullRes.json();
    expect(pullJson.notes.map((n: { id: string }) => n.id)).toContain(note.id);
  });

  test("5分以内の更新がクライアント値のまま保存される", async () => {
    const app = createApp();
    const noteId = crypto.randomUUID();

    await testDB.insert(notes).values({
      id: noteId,
      userId: TEST_USER_ID,
      title: "Original",
      content: "",
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      updatedAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const twoMinAhead = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const updatedNote = makeNote({
      id: noteId,
      title: "Updated from fast-clock device",
      updatedAt: twoMinAhead,
      createdAt: "2020-01-01T00:00:00.000Z",
    });

    const pushRes = await postSync(app, { notes: [updatedNote] });
    expect((await pushRes.json()).syncedIds).toContain(noteId);

    // クライアント値(NOW+2m) > NOW() → GREATESTはクライアント値を採用
    // since=NOW でも取得可能（updatedAt > NOW）
    const pullRes = await getNotes(app, `since=${NOW}`);
    const pullJson = await pullRes.json();
    const found = pullJson.notes.find((n: { id: string }) => n.id === noteId);
    expect(found).toBeDefined();
    expect(found.title).toBe("Updated from fast-clock device");
  });
});
