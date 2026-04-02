import { describe, expect, it } from "vitest";

import { computeActivityStats } from "./computeActivityStats";

type TestActivity = {
  id: string;
  name: string;
  quantityUnit: string;
  showCombinedStats: boolean;
  deletedAt?: string | null;
};

type TestKind = {
  id: string;
  activityId: string;
  name: string;
  color: string | null;
  orderIndex: string;
  deletedAt?: string | null;
};

type TestLog = {
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  date: string;
};

// --- テストデータ共通ビルダー ---

const makeActivity = (
  overrides: Partial<TestActivity> & { id: string; name: string },
): TestActivity => ({
  quantityUnit: "回",
  showCombinedStats: true,
  deletedAt: null,
  ...overrides,
});

const makeKind = (
  overrides: Partial<TestKind> & {
    id: string;
    activityId: string;
    name: string;
  },
): TestKind => ({
  color: null,
  orderIndex: "a",
  deletedAt: null,
  ...overrides,
});

const makeLog = (
  overrides: Partial<TestLog> & { activityId: string },
): TestLog => ({
  activityKindId: null,
  quantity: 1,
  date: "2024-01-01",
  ...overrides,
});

// ---

describe("computeActivityStats", () => {
  describe("基本動作", () => {
    it("通常のActivity+Kindの統計を正しく集計する", () => {
      const activities: TestActivity[] = [
        makeActivity({ id: "a1", name: "ランニング" }),
        makeActivity({ id: "a2", name: "読書" }),
      ];
      const kinds: TestKind[] = [
        makeKind({ id: "k1", activityId: "a1", name: "朝", orderIndex: "a" }),
        makeKind({ id: "k2", activityId: "a1", name: "夜", orderIndex: "b" }),
        makeKind({
          id: "k3",
          activityId: "a2",
          name: "技術書",
          orderIndex: "a",
        }),
        makeKind({ id: "k4", activityId: "a2", name: "小説", orderIndex: "b" }),
      ];
      const logs: TestLog[] = [
        makeLog({
          activityId: "a1",
          activityKindId: "k1",
          quantity: 5,
          date: "2024-01-01",
        }),
        makeLog({
          activityId: "a1",
          activityKindId: "k1",
          quantity: 3,
          date: "2024-01-02",
        }),
        makeLog({
          activityId: "a1",
          activityKindId: "k2",
          quantity: 10,
          date: "2024-01-03",
        }),
        makeLog({
          activityId: "a2",
          activityKindId: "k3",
          quantity: 2,
          date: "2024-01-01",
        }),
        makeLog({
          activityId: "a2",
          activityKindId: "k4",
          quantity: 4,
          date: "2024-01-02",
        }),
      ];

      const result = computeActivityStats(activities, kinds, logs);

      expect(result).toHaveLength(2);

      const a1Stat = result.find((s) => s.id === "a1");
      expect(a1Stat).toBeDefined();
      expect(a1Stat!.name).toBe("ランニング");
      expect(a1Stat!.total).toBe(18); // showCombinedStats=true → 5+3+10
      expect(a1Stat!.kinds).toHaveLength(2);
      expect(a1Stat!.kinds[0]).toMatchObject({
        id: "k1",
        name: "朝",
        total: 8,
      });
      expect(a1Stat!.kinds[1]).toMatchObject({
        id: "k2",
        name: "夜",
        total: 10,
      });

      const a2Stat = result.find((s) => s.id === "a2");
      expect(a2Stat).toBeDefined();
      expect(a2Stat!.total).toBe(6); // 2+4
      expect(a2Stat!.kinds).toHaveLength(2);
      expect(a2Stat!.kinds[0]).toMatchObject({
        id: "k3",
        name: "技術書",
        total: 2,
      });
      expect(a2Stat!.kinds[1]).toMatchObject({
        id: "k4",
        name: "小説",
        total: 4,
      });
    });

    it("activityKindIdがnullのログが「未指定」として集計される", () => {
      const activities: TestActivity[] = [
        makeActivity({ id: "a1", name: "筋トレ" }),
      ];
      const kinds: TestKind[] = [
        makeKind({
          id: "k1",
          activityId: "a1",
          name: "上半身",
          orderIndex: "a",
        }),
      ];
      const logs: TestLog[] = [
        makeLog({ activityId: "a1", activityKindId: "k1", quantity: 10 }),
        makeLog({ activityId: "a1", activityKindId: null, quantity: 5 }),
        makeLog({ activityId: "a1", activityKindId: null, quantity: 3 }),
      ];

      const result = computeActivityStats(activities, kinds, logs);

      expect(result).toHaveLength(1);
      const stat = result[0];
      // k1 + 未指定 の2種類
      expect(stat.kinds).toHaveLength(2);
      expect(stat.kinds[0]).toMatchObject({
        id: "k1",
        name: "上半身",
        total: 10,
      });
      expect(stat.kinds[1]).toMatchObject({
        id: null,
        name: "未指定",
        total: 8,
      });
    });

    it("ログがないActivityは結果に含まれない", () => {
      const activities: TestActivity[] = [
        makeActivity({ id: "a1", name: "ランニング" }),
        makeActivity({ id: "a2", name: "ログなし" }),
      ];
      const kinds: TestKind[] = [];
      const logs: TestLog[] = [makeLog({ activityId: "a1", quantity: 5 })];

      const result = computeActivityStats(activities, kinds, logs);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("a1");
    });
  });

  describe("削除済みエンティティ", () => {
    it("deletedAtが設定されたActivityもactivitiesに含まれていれば統計に表示される", () => {
      const activities: TestActivity[] = [
        makeActivity({ id: "a1", name: "アクティブ" }),
        makeActivity({
          id: "a2",
          name: "削除済みActivity",
          deletedAt: "2024-01-15T00:00:00Z",
        }),
      ];
      const kinds: TestKind[] = [];
      const logs: TestLog[] = [
        makeLog({ activityId: "a1", quantity: 3 }),
        makeLog({ activityId: "a2", quantity: 7 }),
      ];

      const result = computeActivityStats(activities, kinds, logs);

      expect(result).toHaveLength(2);

      const deletedStat = result.find((s) => s.id === "a2");
      expect(deletedStat).toBeDefined();
      expect(deletedStat!.name).toBe("削除済みActivity");
      // 削除済みActivityのログが未指定として集計される
      expect(deletedStat!.kinds).toHaveLength(1);
      expect(deletedStat!.kinds[0]).toMatchObject({
        id: null,
        name: "未指定",
        total: 7,
      });
    });

    it("deletedAtが設定されたKindもallKindsに含まれていれば名前が正しく解決される", () => {
      const activities: TestActivity[] = [
        makeActivity({ id: "a1", name: "読書" }),
      ];
      const kinds: TestKind[] = [
        makeKind({
          id: "k1",
          activityId: "a1",
          name: "アクティブKind",
          orderIndex: "a",
        }),
        makeKind({
          id: "k2",
          activityId: "a1",
          name: "削除済みKind",
          orderIndex: "b",
          deletedAt: "2024-01-10T00:00:00Z",
        }),
      ];
      const logs: TestLog[] = [
        makeLog({ activityId: "a1", activityKindId: "k1", quantity: 5 }),
        makeLog({ activityId: "a1", activityKindId: "k2", quantity: 9 }),
      ];

      const result = computeActivityStats(activities, kinds, logs);

      expect(result).toHaveLength(1);
      const stat = result[0];
      // 削除済みKindも名前解決され、「未指定」にはならない
      expect(stat.kinds).toHaveLength(2);
      expect(stat.kinds[0]).toMatchObject({
        id: "k1",
        name: "アクティブKind",
        total: 5,
      });
      expect(stat.kinds[1]).toMatchObject({
        id: "k2",
        name: "削除済みKind",
        total: 9,
      });
    });

    it("allKindsに存在しないkindIdを持つログは「未指定」として集計される", () => {
      // 削除済みKindがallKindsから除外されている（古い実装）場合の挙動確認
      const activities: TestActivity[] = [
        makeActivity({ id: "a1", name: "ランニング" }),
      ];
      const kinds: TestKind[] = [
        makeKind({ id: "k1", activityId: "a1", name: "朝", orderIndex: "a" }),
        // k2はallKindsに渡さない（除外済みKindを模倣）
      ];
      const logs: TestLog[] = [
        makeLog({ activityId: "a1", activityKindId: "k1", quantity: 5 }),
        makeLog({ activityId: "a1", activityKindId: "k2", quantity: 3 }),
      ];

      const result = computeActivityStats(activities, kinds, logs);

      expect(result).toHaveLength(1);
      const stat = result[0];
      // k2はvalidKindIdsに含まれないため未指定扱い
      expect(stat.kinds).toHaveLength(2);
      expect(stat.kinds[0]).toMatchObject({ id: "k1", name: "朝", total: 5 });
      expect(stat.kinds[1]).toMatchObject({
        id: null,
        name: "未指定",
        total: 3,
      });
    });
  });

  describe("エッジケース", () => {
    it("ログが空の場合、空配列を返す", () => {
      const activities: TestActivity[] = [
        makeActivity({ id: "a1", name: "ランニング" }),
      ];
      const kinds: TestKind[] = [
        makeKind({ id: "k1", activityId: "a1", name: "朝", orderIndex: "a" }),
      ];
      const logs: TestLog[] = [];

      const result = computeActivityStats(activities, kinds, logs);

      expect(result).toHaveLength(0);
    });

    it("showCombinedStats=trueの場合、totalにoverallTotalが設定される", () => {
      const activities: TestActivity[] = [
        makeActivity({ id: "a1", name: "ランニング", showCombinedStats: true }),
      ];
      const kinds: TestKind[] = [
        makeKind({ id: "k1", activityId: "a1", name: "朝", orderIndex: "a" }),
        makeKind({ id: "k2", activityId: "a1", name: "夜", orderIndex: "b" }),
      ];
      const logs: TestLog[] = [
        makeLog({ activityId: "a1", activityKindId: "k1", quantity: 4 }),
        makeLog({ activityId: "a1", activityKindId: "k2", quantity: 6 }),
      ];

      const result = computeActivityStats(activities, kinds, logs);

      expect(result[0].total).toBe(10);
    });

    it("showCombinedStats=falseの場合、totalはnullになる", () => {
      const activities: TestActivity[] = [
        makeActivity({
          id: "a1",
          name: "ランニング",
          showCombinedStats: false,
        }),
      ];
      const kinds: TestKind[] = [
        makeKind({ id: "k1", activityId: "a1", name: "朝", orderIndex: "a" }),
      ];
      const logs: TestLog[] = [
        makeLog({ activityId: "a1", activityKindId: "k1", quantity: 5 }),
      ];

      const result = computeActivityStats(activities, kinds, logs);

      expect(result[0].total).toBeNull();
    });
  });
});
