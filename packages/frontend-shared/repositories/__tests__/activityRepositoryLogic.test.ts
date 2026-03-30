import type {
  ActivityKindRecord,
  ActivityRecord,
} from "@packages/domain/activity/activityRecord";
import type {
  ActivityIconBlob,
  ActivityIconDeleteQueueItem,
} from "@packages/domain/activity/activityRepository";
import type { Syncable } from "@packages/domain/sync/syncableRecord";
import { resetServerTimeForTests } from "@packages/sync-engine";
import { beforeEach, describe, expect, it, vi } from "vitest";

const uuidState = { counter: 0 };

vi.mock("uuid", () => ({
  v7: vi.fn(() => `mock-uuid-${++uuidState.counter}`),
}));

import type { ActivityDbAdapter } from "../activityRepositoryLogic";
import { newActivityRepository } from "../activityRepositoryLogic";

function createInMemoryAdapter() {
  const activities = new Map<string, Syncable<ActivityRecord>>();
  const kinds = new Map<string, Syncable<ActivityKindRecord>>();
  const iconBlobs = new Map<string, ActivityIconBlob>();
  const iconDeleteQueue = new Map<string, ActivityIconDeleteQueueItem>();
  let userId = "user-1";
  let nextOrderIndex = "000001";

  const adapter: ActivityDbAdapter = {
    async getUserId() {
      return userId;
    },
    async getNextOrderIndex() {
      const current = nextOrderIndex;
      nextOrderIndex = String(Number(nextOrderIndex) + 1).padStart(6, "0");
      return current;
    },
    async insertActivity(activity) {
      activities.set(activity.id, activity);
    },
    async getAllActivities() {
      return [...activities.values()]
        .filter((a) => !a.deletedAt)
        .sort((a, b) => a.orderIndex.localeCompare(b.orderIndex));
    },
    async updateActivity(id, changes) {
      const a = activities.get(id);
      if (a)
        activities.set(id, { ...a, ...changes } as Syncable<ActivityRecord>);
    },
    async softDeleteActivityAndKinds(id, timestamp) {
      const a = activities.get(id);
      if (a)
        activities.set(id, {
          ...a,
          deletedAt: timestamp,
          updatedAt: timestamp,
          _syncStatus: "pending",
        });
      for (const [, k] of kinds) {
        if (k.activityId === id) {
          kinds.set(k.id, {
            ...k,
            deletedAt: timestamp,
            updatedAt: timestamp,
            _syncStatus: "pending",
          });
        }
      }
    },
    async insertKinds(newKinds) {
      for (const k of newKinds) kinds.set(k.id, k);
    },
    async getKindsByActivityId(activityId) {
      return [...kinds.values()].filter(
        (k) => k.activityId === activityId && !k.deletedAt,
      );
    },
    async getAllKinds() {
      return [...kinds.values()].filter((k) => !k.deletedAt);
    },
    async updateKind(id, changes) {
      const k = kinds.get(id);
      if (k)
        kinds.set(id, { ...k, ...changes } as Syncable<ActivityKindRecord>);
    },
    async insertKind(kind) {
      kinds.set(kind.id, kind);
    },
    async reorderActivities(orderedIds) {
      orderedIds.forEach((id, i) => {
        const a = activities.get(id);
        if (a)
          activities.set(id, {
            ...a,
            orderIndex: String(i).padStart(6, "0"),
          });
      });
    },
    async getPendingSyncActivities() {
      return [...activities.values()].filter(
        (a) => a._syncStatus === "pending",
      );
    },
    async getPendingSyncActivityKinds() {
      return [...kinds.values()].filter((k) => k._syncStatus === "pending");
    },
    async updateActivitiesSyncStatus(ids, status) {
      for (const id of ids) {
        const a = activities.get(id);
        if (a) activities.set(id, { ...a, _syncStatus: status });
      }
    },
    async updateKindsSyncStatus(ids, status) {
      for (const id of ids) {
        const k = kinds.get(id);
        if (k) kinds.set(id, { ...k, _syncStatus: status });
      }
    },
    async getActivitiesByIds(ids) {
      return ids
        .map((id) => activities.get(id))
        .filter((a): a is Syncable<ActivityRecord> => a !== undefined);
    },
    async getKindsByIds(ids) {
      return ids
        .map((id) => kinds.get(id))
        .filter((k): k is Syncable<ActivityKindRecord> => k !== undefined);
    },
    async bulkUpsertActivities(acts) {
      for (const a of acts) activities.set(a.id, a);
    },
    async bulkUpsertKinds(ks) {
      for (const k of ks) kinds.set(k.id, k);
    },
    async saveActivityIconBlob(activityId, base64, mimeType) {
      iconBlobs.set(activityId, { activityId, base64, mimeType });
    },
    async getActivityIconBlob(activityId) {
      return iconBlobs.get(activityId);
    },
    async deleteActivityIconBlob(activityId) {
      iconBlobs.delete(activityId);
    },
    async getAllIconBlobs() {
      return [...iconBlobs.values()];
    },
    async getPendingIconBlobs() {
      return [...iconBlobs.values()];
    },
    async completeActivityIconSync(activityId, iconUrl, iconThumbnailUrl) {
      const a = activities.get(activityId);
      if (a)
        activities.set(activityId, {
          ...a,
          iconUrl,
          iconThumbnailUrl,
          _syncStatus: "pending",
        });
    },
    async clearActivityIcon(activityId) {
      const a = activities.get(activityId);
      if (a)
        activities.set(activityId, {
          ...a,
          iconType: "emoji",
          iconUrl: null,
          iconThumbnailUrl: null,
          _syncStatus: "pending",
        });
      iconBlobs.delete(activityId);
      iconDeleteQueue.set(activityId, { activityId });
    },
    async getPendingIconDeletes() {
      return [...iconDeleteQueue.values()];
    },
    async removeIconDeleteQueue(activityId) {
      iconDeleteQueue.delete(activityId);
    },
    async cacheRemoteIcon() {
      /* no-op in test */
    },
  };

  return {
    adapter,
    activities,
    kinds,
    iconBlobs,
    iconDeleteQueue,
    setUserId: (id: string) => {
      userId = id;
    },
    setGetUserIdToThrow: () => {
      adapter.getUserId = () => {
        throw new Error("Cannot create activity: userId is not set");
      };
    },
  };
}

describe("activityRepositoryLogic", () => {
  let mem: ReturnType<typeof createInMemoryAdapter>;
  let repo: ReturnType<typeof newActivityRepository>;

  beforeEach(() => {
    uuidState.counter = 0;
    resetServerTimeForTests();
    mem = createInMemoryAdapter();
    repo = newActivityRepository(mem.adapter);
  });

  // ========== Create ==========
  describe("createActivity", () => {
    it("Kindsなしで新しいActivityを作成する", async () => {
      const result = await repo.createActivity({
        name: "Running",
        quantityUnit: "km",
        emoji: "\u{1F3C3}",
        showCombinedStats: false,
      });

      expect(result.id).toBe("mock-uuid-1");
      expect(result.userId).toBe("user-1");
      expect(result.name).toBe("Running");
      expect(result.quantityUnit).toBe("km");
      expect(result.emoji).toBe("\u{1F3C3}");
      expect(result.iconType).toBe("emoji");
      expect(result.iconUrl).toBeNull();
      expect(result.iconThumbnailUrl).toBeNull();
      expect(result.description).toBe("");
      expect(result.orderIndex).toBe("000001");
      expect(result.showCombinedStats).toBe(false);
      expect(result.recordingMode).toBe("manual");
      expect(result.recordingModeConfig).toBeNull();
      expect(result._syncStatus).toBe("pending");
      expect(result.deletedAt).toBeNull();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      // adapterに保存されていること
      const stored = mem.activities.get("mock-uuid-1");
      expect(stored).toEqual(result);

      // kindsは作成されていないこと
      expect(mem.kinds.size).toBe(0);
    });

    it("Kindsありでの作成", async () => {
      const result = await repo.createActivity({
        name: "Exercise",
        quantityUnit: "sets",
        emoji: "\u{1F4AA}",
        showCombinedStats: false,
        kinds: [
          { name: "Push-ups", color: "#ff0000" },
          { name: "Sit-ups", color: "#00ff00" },
        ],
      });

      expect(result.id).toBe("mock-uuid-1");

      // kindsが作成されていること
      expect(mem.kinds.size).toBe(2);

      const kindValues = [...mem.kinds.values()];
      const kind0 = kindValues.find((k) => k.name === "Push-ups")!;
      const kind1 = kindValues.find((k) => k.name === "Sit-ups")!;

      expect(kind0.id).toBe("mock-uuid-2");
      expect(kind0.activityId).toBe("mock-uuid-1");
      expect(kind0.color).toBe("#ff0000");
      expect(kind0.orderIndex).toBe("000000");
      expect(kind0._syncStatus).toBe("pending");

      expect(kind1.id).toBe("mock-uuid-3");
      expect(kind1.activityId).toBe("mock-uuid-1");
      expect(kind1.color).toBe("#00ff00");
      expect(kind1.orderIndex).toBe("000001");
      expect(kind1._syncStatus).toBe("pending");
    });

    it("Kindsのcolorが空文字の場合nullになる", async () => {
      await repo.createActivity({
        name: "Test",
        quantityUnit: "\u56DE",
        emoji: "\u2705",
        showCombinedStats: false,
        kinds: [{ name: "Kind1", color: "" }],
      });

      const kindValues = [...mem.kinds.values()];
      expect(kindValues[0].color).toBeNull();
    });

    it("authStateがない場合エラー", async () => {
      mem.setGetUserIdToThrow();

      await expect(
        repo.createActivity({
          name: "Test",
          quantityUnit: "\u56DE",
          emoji: "\u{1F3AF}",
          showCombinedStats: false,
        }),
      ).rejects.toThrow("Cannot create activity: userId is not set");
    });

    it("recordingModeを指定できる", async () => {
      const result = await repo.createActivity({
        name: "Counter",
        quantityUnit: "回",
        emoji: "🔢",
        showCombinedStats: false,
        recordingMode: "counter" as const,
        recordingModeConfig: JSON.stringify({
          mode: "counter",
          steps: [1, 5, 10],
        }),
      });

      expect(result.recordingMode).toBe("counter");
      expect(result.recordingModeConfig).toBe(
        JSON.stringify({ mode: "counter", steps: [1, 5, 10] }),
      );
    });

    it("recordingMode未指定時はmanualになる", async () => {
      const result = await repo.createActivity({
        name: "Default",
        quantityUnit: "回",
        emoji: "📝",
        showCombinedStats: false,
      });

      expect(result.recordingMode).toBe("manual");
      expect(result.recordingModeConfig).toBeNull();
    });

    it("iconTypeを指定できる", async () => {
      const result = await repo.createActivity({
        name: "Photo",
        quantityUnit: "\u679A",
        emoji: "",
        showCombinedStats: false,
        iconType: "upload",
      });

      expect(result.iconType).toBe("upload");
    });
  });

  // ========== Update ==========
  describe("updateActivity", () => {
    it("基本的な更新（kindsなし）", async () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date("2026-03-01T00:00:00Z"));

        // まず作成
        const created = await repo.createActivity({
          name: "Running",
          quantityUnit: "km",
          emoji: "\u{1F3C3}",
          showCombinedStats: false,
        });

        // syncedにしておく
        mem.activities.set(created.id, {
          ...created,
          _syncStatus: "synced",
        });

        // 時間を進めて更新
        vi.setSystemTime(new Date("2026-03-02T00:00:00Z"));

        await repo.updateActivity(created.id, { name: "Walking" });

        const updated = mem.activities.get(created.id)!;
        expect(updated.name).toBe("Walking");
        expect(updated._syncStatus).toBe("pending");
        expect(updated.updatedAt).not.toBe(created.updatedAt);
        expect(updated.updatedAt).toBe("2026-03-02T00:00:00.000Z");
      } finally {
        vi.useRealTimers();
      }
    });

    it("updatedKindsがあり既存kindの更新・削除・新規追加を行う", async () => {
      // activityを作成
      const created = await repo.createActivity({
        name: "Exercise",
        quantityUnit: "sets",
        emoji: "\u{1F4AA}",
        showCombinedStats: false,
      });

      // 既存kindsをadapterに直接追加
      const now = new Date().toISOString();
      const existingKind1: Syncable<ActivityKindRecord> = {
        id: "k1",
        activityId: created.id,
        name: "Old1",
        color: "#111",
        orderIndex: "000000",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        _syncStatus: "synced",
      };
      const existingKind2: Syncable<ActivityKindRecord> = {
        id: "k2",
        activityId: created.id,
        name: "Old2",
        color: "#222",
        orderIndex: "000001",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        _syncStatus: "synced",
      };
      mem.kinds.set("k1", existingKind1);
      mem.kinds.set("k2", existingKind2);

      // uuidカウンターをリセット（新規kind用）
      uuidState.counter = 10;

      await repo.updateActivity(created.id, { name: "Updated" }, [
        { id: "k1", name: "Updated1", color: "#aaa" },
        { name: "NewKind", color: "#bbb" },
      ]);

      // k2がsoft-deleteされる
      const k2 = mem.kinds.get("k2")!;
      expect(k2.deletedAt).not.toBeNull();
      expect(k2._syncStatus).toBe("pending");

      // k1が更新される
      const k1 = mem.kinds.get("k1")!;
      expect(k1.name).toBe("Updated1");
      expect(k1.color).toBe("#aaa");
      expect(k1.orderIndex).toBe("000000");
      expect(k1._syncStatus).toBe("pending");
      expect(k1.deletedAt).toBeNull();

      // 新規kindが追加される
      const newKind = mem.kinds.get("mock-uuid-11")!;
      expect(newKind).toBeDefined();
      expect(newKind.activityId).toBe(created.id);
      expect(newKind.name).toBe("NewKind");
      expect(newKind.color).toBe("#bbb");
      expect(newKind.orderIndex).toBe("000001");
      expect(newKind._syncStatus).toBe("pending");
    });

    it("updatedKindsがundefinedの場合kinds操作をスキップする", async () => {
      const created = await repo.createActivity({
        name: "Running",
        quantityUnit: "km",
        emoji: "\u{1F3C3}",
        showCombinedStats: false,
      });

      // 既存kindを追加
      const now = new Date().toISOString();
      mem.kinds.set("k1", {
        id: "k1",
        activityId: created.id,
        name: "Kind1",
        color: "#000",
        orderIndex: "000000",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        _syncStatus: "synced",
      });

      // kindsを指定しないで更新
      await repo.updateActivity(created.id, { emoji: "\u{1F3C3}" });

      // kindsは変更されないこと
      const k1 = mem.kinds.get("k1")!;
      expect(k1.name).toBe("Kind1");
      expect(k1._syncStatus).toBe("synced");
    });
  });

  // ========== Delete ==========
  describe("softDeleteActivity", () => {
    it("Activity自体と関連するActivityKindsをsoft-deleteする", async () => {
      // activityとkindsを作成
      const created = await repo.createActivity({
        name: "Exercise",
        quantityUnit: "sets",
        emoji: "\u{1F4AA}",
        showCombinedStats: false,
        kinds: [
          { name: "Push-ups", color: "#ff0000" },
          { name: "Sit-ups", color: "#00ff00" },
        ],
      });

      await repo.softDeleteActivity(created.id);

      // activityがsoft-deleteされること
      const activity = mem.activities.get(created.id)!;
      expect(activity.deletedAt).not.toBeNull();
      expect(activity._syncStatus).toBe("pending");

      // 関連kindsもsoft-deleteされること
      for (const [, kind] of mem.kinds) {
        expect(kind.deletedAt).not.toBeNull();
        expect(kind._syncStatus).toBe("pending");
      }

      // getAllActivitiesから除外されること
      const all = await repo.getAllActivities();
      expect(all).toHaveLength(0);
    });
  });

  // ========== Sync helpers ==========
  describe("getPendingSyncActivities", () => {
    it("_syncStatus=pendingのActivitiesを返す", async () => {
      await repo.createActivity({
        name: "Running",
        quantityUnit: "km",
        emoji: "\u{1F3C3}",
        showCombinedStats: false,
      });

      const pending = await repo.getPendingSyncActivities();
      expect(pending).toHaveLength(1);
      expect(pending[0]._syncStatus).toBe("pending");
    });
  });

  describe("getPendingSyncActivityKinds", () => {
    it("_syncStatus=pendingのActivityKindsを返す", async () => {
      await repo.createActivity({
        name: "Exercise",
        quantityUnit: "sets",
        emoji: "\u{1F4AA}",
        showCombinedStats: false,
        kinds: [{ name: "Push-ups", color: "#ff0000" }],
      });

      const pending = await repo.getPendingSyncActivityKinds();
      expect(pending).toHaveLength(1);
      expect(pending[0]._syncStatus).toBe("pending");
    });
  });

  describe("markActivitiesSynced", () => {
    it("指定IDのActivitiesをsynced状態にする", async () => {
      const created = await repo.createActivity({
        name: "Running",
        quantityUnit: "km",
        emoji: "\u{1F3C3}",
        showCombinedStats: false,
      });

      expect(mem.activities.get(created.id)!._syncStatus).toBe("pending");

      await repo.markActivitiesSynced([created.id]);

      expect(mem.activities.get(created.id)!._syncStatus).toBe("synced");
    });

    it("空配列の場合は何もしない", async () => {
      await repo.markActivitiesSynced([]);
      // エラーが起きないことを確認
    });
  });

  describe("markActivityKindsSynced", () => {
    it("指定IDのActivityKindsをsynced状態にする", async () => {
      await repo.createActivity({
        name: "Exercise",
        quantityUnit: "sets",
        emoji: "\u{1F4AA}",
        showCombinedStats: false,
        kinds: [{ name: "Push-ups", color: "#ff0000" }],
      });

      const kindId = [...mem.kinds.keys()][0];
      expect(mem.kinds.get(kindId)!._syncStatus).toBe("pending");

      await repo.markActivityKindsSynced([kindId]);

      expect(mem.kinds.get(kindId)!._syncStatus).toBe("synced");
    });

    it("空配列の場合は何もしない", async () => {
      await repo.markActivityKindsSynced([]);
    });
  });

  describe("markActivitiesFailed", () => {
    it("指定IDのActivitiesをfailed状態にする", async () => {
      const created = await repo.createActivity({
        name: "Running",
        quantityUnit: "km",
        emoji: "\u{1F3C3}",
        showCombinedStats: false,
      });

      await repo.markActivitiesFailed([created.id]);

      expect(mem.activities.get(created.id)!._syncStatus).toBe("failed");
    });

    it("空配列の場合は何もしない", async () => {
      await repo.markActivitiesFailed([]);
    });
  });

  describe("markActivityKindsFailed", () => {
    it("指定IDのActivityKindsをfailed状態にする", async () => {
      await repo.createActivity({
        name: "Exercise",
        quantityUnit: "sets",
        emoji: "\u{1F4AA}",
        showCombinedStats: false,
        kinds: [{ name: "Push-ups", color: "#ff0000" }],
      });

      const kindId = [...mem.kinds.keys()][0];
      await repo.markActivityKindsFailed([kindId]);

      expect(mem.kinds.get(kindId)!._syncStatus).toBe("failed");
    });

    it("空配列の場合は何もしない", async () => {
      await repo.markActivityKindsFailed([]);
    });
  });

  // ========== Icon management ==========
  describe("saveActivityIconBlob", () => {
    it("アダプタにBlobデータを保存する", async () => {
      await repo.saveActivityIconBlob("act-1", "base64data", "image/png");

      const blob = mem.iconBlobs.get("act-1");
      expect(blob).toEqual({
        activityId: "act-1",
        base64: "base64data",
        mimeType: "image/png",
      });
    });
  });

  describe("getActivityIconBlob", () => {
    it("指定activityIdのBlobを取得する", async () => {
      mem.iconBlobs.set("act-1", {
        activityId: "act-1",
        base64: "data",
        mimeType: "image/png",
      });

      const result = await repo.getActivityIconBlob("act-1");
      expect(result).toEqual({
        activityId: "act-1",
        base64: "data",
        mimeType: "image/png",
      });
    });

    it("存在しない場合undefinedを返す", async () => {
      const result = await repo.getActivityIconBlob("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("deleteActivityIconBlob", () => {
    it("指定activityIdのBlobを削除する", async () => {
      mem.iconBlobs.set("act-1", {
        activityId: "act-1",
        base64: "data",
        mimeType: "image/png",
      });

      await repo.deleteActivityIconBlob("act-1");

      expect(mem.iconBlobs.has("act-1")).toBe(false);
    });
  });

  describe("getPendingIconBlobs", () => {
    it("未同期のBlobを返す", async () => {
      mem.iconBlobs.set("act-1", {
        activityId: "act-1",
        base64: "data1",
        mimeType: "image/png",
      });
      mem.iconBlobs.set("act-2", {
        activityId: "act-2",
        base64: "data2",
        mimeType: "image/jpeg",
      });

      const result = await repo.getPendingIconBlobs();
      expect(result).toHaveLength(2);
    });
  });

  describe("getAllIconBlobs", () => {
    it("全Blobを返す", async () => {
      mem.iconBlobs.set("act-1", {
        activityId: "act-1",
        base64: "data1",
        mimeType: "image/png",
      });
      mem.iconBlobs.set("act-2", {
        activityId: "act-2",
        base64: "data2",
        mimeType: "image/jpeg",
      });

      const result = await repo.getAllIconBlobs();
      expect(result).toHaveLength(2);
    });
  });

  describe("completeActivityIconSync", () => {
    it("iconUrlを更新しsyncStatusをpendingにする", async () => {
      const created = await repo.createActivity({
        name: "Photo",
        quantityUnit: "\u679A",
        emoji: "",
        showCombinedStats: false,
        iconType: "upload",
      });

      // syncedにしておく
      mem.activities.set(created.id, {
        ...created,
        _syncStatus: "synced",
      });

      await repo.completeActivityIconSync(
        created.id,
        "https://example.com/icon.png",
        "https://example.com/icon-thumb.png",
      );

      const updated = mem.activities.get(created.id)!;
      expect(updated.iconUrl).toBe("https://example.com/icon.png");
      expect(updated.iconThumbnailUrl).toBe(
        "https://example.com/icon-thumb.png",
      );
      expect(updated._syncStatus).toBe("pending");
    });
  });

  describe("clearActivityIcon", () => {
    it("アイコンをクリアしBlob削除+削除キューに追加する", async () => {
      const created = await repo.createActivity({
        name: "Photo",
        quantityUnit: "\u679A",
        emoji: "",
        showCombinedStats: false,
        iconType: "upload",
      });

      // Blobを追加
      mem.iconBlobs.set(created.id, {
        activityId: created.id,
        base64: "data",
        mimeType: "image/png",
      });

      await repo.clearActivityIcon(created.id);

      const updated = mem.activities.get(created.id)!;
      expect(updated.iconType).toBe("emoji");
      expect(updated.iconUrl).toBeNull();
      expect(updated.iconThumbnailUrl).toBeNull();
      expect(updated._syncStatus).toBe("pending");

      // Blobが削除されていること
      expect(mem.iconBlobs.has(created.id)).toBe(false);

      // 削除キューに追加されていること
      expect(mem.iconDeleteQueue.has(created.id)).toBe(true);
    });
  });

  describe("getPendingIconDeletes", () => {
    it("削除キューの全件を返す", async () => {
      mem.iconDeleteQueue.set("act-1", { activityId: "act-1" });

      const result = await repo.getPendingIconDeletes();
      expect(result).toEqual([{ activityId: "act-1" }]);
    });
  });

  describe("removeIconDeleteQueue", () => {
    it("指定activityIdを削除キューから取り除く", async () => {
      mem.iconDeleteQueue.set("act-1", { activityId: "act-1" });

      await repo.removeIconDeleteQueue("act-1");

      expect(mem.iconDeleteQueue.has("act-1")).toBe(false);
    });
  });

  // ========== Server upsert ==========
  describe("upsertActivities", () => {
    it("サーバーデータをsynced状態でupsertする", async () => {
      const serverActivities = [
        {
          id: "a1",
          userId: "user-1",
          name: "Running",
          label: "",
          emoji: "\u{1F3C3}",
          iconType: "emoji" as const,
          iconUrl: null,
          iconThumbnailUrl: null,
          description: "",
          quantityUnit: "km",
          orderIndex: "000001",
          showCombinedStats: false,
          recordingMode: "manual" as const,
          recordingModeConfig: null,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
        {
          id: "a2",
          userId: "user-1",
          name: "Study",
          label: "",
          emoji: "\u{1F4DA}",
          iconType: "emoji" as const,
          iconUrl: null,
          iconThumbnailUrl: null,
          description: "",
          quantityUnit: "min",
          orderIndex: "000002",
          showCombinedStats: true,
          recordingMode: "manual" as const,
          recordingModeConfig: null,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertActivities(serverActivities);

      const a1 = mem.activities.get("a1")!;
      expect(a1.name).toBe("Running");
      expect(a1._syncStatus).toBe("synced");

      const a2 = mem.activities.get("a2")!;
      expect(a2.name).toBe("Study");
      expect(a2._syncStatus).toBe("synced");
    });

    it("pendingレコードを上書きしない", async () => {
      // ローカルにpendingレコードを追加
      mem.activities.set("a1", {
        id: "a1",
        userId: "user-1",
        name: "LocalRunning",
        label: "",
        emoji: "\u{1F3C3}",
        iconType: "emoji",
        iconUrl: null,
        iconThumbnailUrl: null,
        description: "",
        quantityUnit: "km",
        orderIndex: "000001",
        showCombinedStats: false,
        recordingMode: "manual" as const,
        recordingModeConfig: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      });

      const serverActivities = [
        {
          id: "a1",
          userId: "user-1",
          name: "ServerRunning",
          label: "",
          emoji: "\u{1F3C3}",
          iconType: "emoji" as const,
          iconUrl: null,
          iconThumbnailUrl: null,
          description: "",
          quantityUnit: "km",
          orderIndex: "000001",
          showCombinedStats: false,
          recordingMode: "manual" as const,
          recordingModeConfig: null,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
        {
          id: "a2",
          userId: "user-1",
          name: "Study",
          label: "",
          emoji: "\u{1F4DA}",
          iconType: "emoji" as const,
          iconUrl: null,
          iconThumbnailUrl: null,
          description: "",
          quantityUnit: "min",
          orderIndex: "000002",
          showCombinedStats: true,
          recordingMode: "manual" as const,
          recordingModeConfig: null,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertActivities(serverActivities);

      // a1はpendingのまま（サーバーデータで上書きされない）
      const a1 = mem.activities.get("a1")!;
      expect(a1.name).toBe("LocalRunning");
      expect(a1._syncStatus).toBe("pending");

      // a2はsynced状態で追加される
      const a2 = mem.activities.get("a2")!;
      expect(a2.name).toBe("Study");
      expect(a2._syncStatus).toBe("synced");
    });

    it("ローカルのupdatedAtが新しいレコードを上書きしない", async () => {
      mem.activities.set("a1", {
        id: "a1",
        userId: "user-1",
        name: "NewerLocal",
        label: "",
        emoji: "\u{1F3C3}",
        iconType: "emoji",
        iconUrl: null,
        iconThumbnailUrl: null,
        description: "",
        quantityUnit: "km",
        orderIndex: "000001",
        showCombinedStats: false,
        recordingMode: "manual" as const,
        recordingModeConfig: null,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-05T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      });

      const serverActivities = [
        {
          id: "a1",
          userId: "user-1",
          name: "OlderServer",
          label: "",
          emoji: "\u{1F3C3}",
          iconType: "emoji" as const,
          iconUrl: null,
          iconThumbnailUrl: null,
          description: "",
          quantityUnit: "km",
          orderIndex: "000001",
          showCombinedStats: false,
          recordingMode: "manual" as const,
          recordingModeConfig: null,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertActivities(serverActivities);

      // ローカルのほうが新しいので上書きされない
      const a1 = mem.activities.get("a1")!;
      expect(a1.name).toBe("NewerLocal");
    });

    it("空配列の場合何もしない", async () => {
      await repo.upsertActivities([]);
      expect(mem.activities.size).toBe(0);
    });
  });

  describe("upsertActivityKinds", () => {
    it("サーバーデータをsynced状態でupsertする", async () => {
      const serverKinds = [
        {
          id: "k1",
          activityId: "a1",
          name: "Kind1",
          color: "#ff0000",
          orderIndex: "000000",
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertActivityKinds(serverKinds);

      const k1 = mem.kinds.get("k1")!;
      expect(k1.name).toBe("Kind1");
      expect(k1._syncStatus).toBe("synced");
    });

    it("pendingレコードを上書きしない", async () => {
      mem.kinds.set("k1", {
        id: "k1",
        activityId: "a1",
        name: "LocalKind",
        color: "#111",
        orderIndex: "000000",
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      });

      const serverKinds = [
        {
          id: "k1",
          activityId: "a1",
          name: "ServerKind",
          color: "#222",
          orderIndex: "000000",
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
        {
          id: "k2",
          activityId: "a1",
          name: "Kind2",
          color: "#333",
          orderIndex: "000001",
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertActivityKinds(serverKinds);

      // k1はpendingのまま
      const k1 = mem.kinds.get("k1")!;
      expect(k1.name).toBe("LocalKind");
      expect(k1._syncStatus).toBe("pending");

      // k2はsynced状態で追加
      const k2 = mem.kinds.get("k2")!;
      expect(k2.name).toBe("Kind2");
      expect(k2._syncStatus).toBe("synced");
    });

    it("ローカルのupdatedAtが新しいレコードを上書きしない", async () => {
      mem.kinds.set("k1", {
        id: "k1",
        activityId: "a1",
        name: "NewerLocal",
        color: "#111",
        orderIndex: "000000",
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-05T00:00:00Z",
        deletedAt: null,
        _syncStatus: "synced",
      });

      const serverKinds = [
        {
          id: "k1",
          activityId: "a1",
          name: "OlderServer",
          color: "#222",
          orderIndex: "000000",
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertActivityKinds(serverKinds);

      const k1 = mem.kinds.get("k1")!;
      expect(k1.name).toBe("NewerLocal");
    });

    it("全レコードがpendingの場合bulkUpsertをスキップする", async () => {
      mem.kinds.set("k1", {
        id: "k1",
        activityId: "a1",
        name: "Local",
        color: "#111",
        orderIndex: "000000",
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: "2026-03-01T00:00:00Z",
        deletedAt: null,
        _syncStatus: "pending",
      });

      const serverKinds = [
        {
          id: "k1",
          activityId: "a1",
          name: "Server",
          color: "#222",
          orderIndex: "000000",
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
          deletedAt: null,
        },
      ];

      await repo.upsertActivityKinds(serverKinds);

      // pendingのため上書きされない
      const k1 = mem.kinds.get("k1")!;
      expect(k1.name).toBe("Local");
      expect(k1._syncStatus).toBe("pending");
    });

    it("空配列の場合何もしない", async () => {
      await repo.upsertActivityKinds([]);
      expect(mem.kinds.size).toBe(0);
    });
  });
});
