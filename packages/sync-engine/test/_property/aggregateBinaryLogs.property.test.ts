import { fc, test } from "@fast-check/vitest";
import { describe, expect } from "vitest";

import { aggregateBinaryLogs } from "../../core/aggregateBinaryLogs";

type PendingLog = {
  id: string;
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  date: string;
  createdAt: string;
  deletedAt: string | null;
};

const pendingLogArb = fc
  .record({
    id: fc.uuid(),
    activityId: fc.constantFrom("a-bin-1", "a-bin-2", "a-manual"),
    activityKindId: fc.option(fc.constantFrom("k1", "k2"), { nil: null }),
    quantity: fc.option(fc.integer({ min: 0, max: 50 }), { nil: null }),
    date: fc.constantFrom("2026-03-14", "2026-03-15", "2026-03-16"),
    createdAt: fc.date({
      min: new Date("2026-03-14T00:00:00Z"),
      max: new Date("2026-03-16T23:59:59Z"),
      noInvalidDate: true,
    }),
    deletedAt: fc.option(
      fc.date({
        min: new Date("2026-03-14T00:00:00Z"),
        max: new Date("2026-03-16T23:59:59Z"),
        noInvalidDate: true,
      }),
      { nil: null },
    ),
  })
  .map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
  }));

const activitiesConst = [
  { id: "a-bin-1", recordingMode: "binary" },
  { id: "a-bin-2", recordingMode: "binary" },
  { id: "a-manual", recordingMode: "manual" },
];

type Op =
  | { kind: "update"; id: string; quantity: number }
  | { kind: "delete"; ids: string[] };

async function run(logs: PendingLog[]): Promise<Op[]> {
  const ops: Op[] = [];
  await aggregateBinaryLogs(
    async () => logs.map((l) => ({ ...l })),
    async () => activitiesConst.map((a) => ({ ...a })),
    async (id, changes) => {
      ops.push({ kind: "update", id, quantity: changes.quantity });
    },
    async (ids) => {
      ops.push({ kind: "delete", ids: [...ids] });
    },
  );
  return ops;
}

function totalKept(updateOps: Op[]): number {
  // 各 update op の quantity 値の合計
  let sum = 0;
  for (const op of updateOps) {
    if (op.kind === "update") sum += op.quantity;
  }
  return sum;
}

function expectedAggregateSum(logs: PendingLog[]): number {
  const binaryActivityIds = new Set(
    activitiesConst
      .filter((a) => a.recordingMode === "binary")
      .map((a) => a.id),
  );
  // group key by date|activityId|kindId
  const groups = new Map<string, PendingLog[]>();
  for (const l of logs) {
    if (!binaryActivityIds.has(l.activityId)) continue;
    if (l.deletedAt) continue;
    const key = `${l.date}|${l.activityId}|${l.activityKindId ?? ""}`;
    const g = groups.get(key) ?? [];
    g.push(l);
    groups.set(key, g);
  }
  // groups with size > 1 are aggregated; their totalQuantity is summed
  let sum = 0;
  for (const [, g] of groups) {
    if (g.length > 1) {
      sum += g.reduce((acc, l) => acc + (l.quantity ?? 0), 0);
    }
  }
  return sum;
}

describe("aggregateBinaryLogs property", () => {
  test.prop([fc.array(pendingLogArb, { minLength: 0, maxLength: 25 })])(
    "順序非依存（commutativity）: 入力配列をシャッフルしても集計後のkeeperごとのquantity合計は同じ",
    async (logs) => {
      const ops1 = await run([...logs]);
      const ops2 = await run([...logs].reverse());
      const ops3 = await run(
        [...logs].sort((a, b) => a.id.localeCompare(b.id)),
      );

      expect(totalKept(ops1)).toBe(totalKept(ops2));
      expect(totalKept(ops1)).toBe(totalKept(ops3));
      // 期待値とも一致
      expect(totalKept(ops1)).toBe(expectedAggregateSum(logs));
    },
  );

  test.prop([fc.array(pendingLogArb, { minLength: 0, maxLength: 25 })])(
    "冪等性: 同じ入力で2回呼んでも更新内容は決定論的",
    async (logs) => {
      const ops1 = await run(logs);
      const ops2 = await run(logs);
      // updates の quantity 合計は両回で一致
      expect(totalKept(ops1)).toBe(totalKept(ops2));
      // delete されるidの数も一致
      const delCount = (ops: Op[]) =>
        ops
          .filter((o) => o.kind === "delete")
          .reduce(
            (acc, o) => acc + (o.kind === "delete" ? o.ids.length : 0),
            0,
          );
      expect(delCount(ops1)).toBe(delCount(ops2));
    },
  );

  test.prop([fc.array(pendingLogArb, { minLength: 0, maxLength: 25 })])(
    "保存（conservation）: keeper の quantity 合計 = 入力の binary かつ deletedAt なしのログのうち、重複グループに属する quantity 合計",
    async (logs) => {
      const ops = await run(logs);
      expect(totalKept(ops)).toBe(expectedAggregateSum(logs));
    },
  );

  test.prop([fc.array(pendingLogArb, { minLength: 0, maxLength: 25 })])(
    "削除安全性: deletedAt 付きログは update/delete 対象にならない",
    async (logs) => {
      const ops = await run(logs);
      const deletedIds = new Set(
        logs.filter((l) => l.deletedAt).map((l) => l.id),
      );
      for (const op of ops) {
        if (op.kind === "update") {
          expect(deletedIds.has(op.id)).toBe(false);
        }
        if (op.kind === "delete") {
          for (const id of op.ids) {
            expect(deletedIds.has(id)).toBe(false);
          }
        }
      }
    },
  );

  test.prop([fc.array(pendingLogArb, { minLength: 0, maxLength: 25 })])(
    "manual モードのログは集約されない",
    async (logs) => {
      const ops = await run(logs);
      const manualIds = new Set(
        logs.filter((l) => l.activityId === "a-manual").map((l) => l.id),
      );
      for (const op of ops) {
        if (op.kind === "update") {
          expect(manualIds.has(op.id)).toBe(false);
        }
        if (op.kind === "delete") {
          for (const id of op.ids) {
            expect(manualIds.has(id)).toBe(false);
          }
        }
      }
    },
  );
});
