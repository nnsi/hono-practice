import { describe, expect, it } from "vitest";
import { buildCSVContent, escapeCSVField } from "@packages/domain/csv/csvExport";
import type {
  DexieActivity,
  DexieActivityKind,
  DexieActivityLog,
} from "../db/schema";

function makeLog(
  overrides: Partial<DexieActivityLog> = {},
): DexieActivityLog {
  return {
    id: "log-1",
    activityId: "act-1",
    activityKindId: null,
    quantity: 3,
    memo: "",
    date: "2026-01-15",
    time: null,
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
    deletedAt: null,
    _syncStatus: "synced",
    ...overrides,
  };
}

function makeActivity(
  overrides: Partial<DexieActivity> = {},
): DexieActivity {
  return {
    id: "act-1",
    userId: "user-1",
    name: "ランニング",
    label: "",
    emoji: "🏃",
    iconType: "emoji",
    iconUrl: null,
    iconThumbnailUrl: null,
    description: "",
    quantityUnit: "km",
    orderIndex: "0",
    showCombinedStats: false,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    deletedAt: null,
    _syncStatus: "synced",
    ...overrides,
  };
}

function makeKind(
  overrides: Partial<DexieActivityKind> = {},
): DexieActivityKind {
  return {
    id: "kind-1",
    activityId: "act-1",
    name: "朝ラン",
    color: null,
    orderIndex: "0",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    deletedAt: null,
    _syncStatus: "synced",
    ...overrides,
  };
}

describe("escapeCSVField", () => {
  it("普通の文字列はそのまま返す", () => {
    expect(escapeCSVField("hello")).toBe("hello");
  });

  it("カンマを含む場合はダブルクォートで囲む", () => {
    expect(escapeCSVField("a,b")).toBe('"a,b"');
  });

  it("ダブルクォートを含む場合はエスケープして囲む", () => {
    expect(escapeCSVField('say "hi"')).toBe('"say ""hi"""');
  });

  it("改行を含む場合はダブルクォートで囲む", () => {
    expect(escapeCSVField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("空文字列はそのまま返す", () => {
    expect(escapeCSVField("")).toBe("");
  });
});

describe("buildCSVContent", () => {
  it("BOM付きCSVが生成される", () => {
    const result = buildCSVContent([], new Map(), new Map());
    expect(result.startsWith("\uFEFF")).toBe(true);
  });

  it("ヘッダー行が正しい", () => {
    const result = buildCSVContent([], new Map(), new Map());
    const lines = result.replace("\uFEFF", "").split("\n");
    expect(lines[0]).toBe("date,activity,kind,quantity,memo");
  });

  it("活動名と種別名がIDから解決される", () => {
    const log = makeLog({ activityKindId: "kind-1" });
    const activity = makeActivity();
    const kind = makeKind();

    const activityMap = new Map([[activity.id, activity]]);
    const kindMap = new Map([[kind.id, kind]]);

    const result = buildCSVContent([log], activityMap, kindMap);
    const lines = result.replace("\uFEFF", "").split("\n");
    expect(lines[1]).toBe("2026-01-15,ランニング,朝ラン,3,");
  });

  it("種別なしのログでは種別カラムが空", () => {
    const log = makeLog({ activityKindId: null });
    const activity = makeActivity();

    const activityMap = new Map([[activity.id, activity]]);

    const result = buildCSVContent([log], activityMap, new Map());
    const lines = result.replace("\uFEFF", "").split("\n");
    expect(lines[1]).toBe("2026-01-15,ランニング,,3,");
  });

  it("存在しないactivityIdの場合は空文字", () => {
    const log = makeLog({ activityId: "unknown" });

    const result = buildCSVContent([log], new Map(), new Map());
    const lines = result.replace("\uFEFF", "").split("\n");
    expect(lines[1]).toBe("2026-01-15,,,3,");
  });

  it("quantityがnullの場合は0", () => {
    const log = makeLog({ quantity: null });
    const activity = makeActivity();
    const activityMap = new Map([[activity.id, activity]]);

    const result = buildCSVContent([log], activityMap, new Map());
    const lines = result.replace("\uFEFF", "").split("\n");
    expect(lines[1]).toBe("2026-01-15,ランニング,,0,");
  });

  it("メモにカンマが含まれる場合はエスケープされる", () => {
    const log = makeLog({ memo: "朝の,メモ" });
    const activity = makeActivity();
    const activityMap = new Map([[activity.id, activity]]);

    const result = buildCSVContent([log], activityMap, new Map());
    const lines = result.replace("\uFEFF", "").split("\n");
    expect(lines[1]).toBe('2026-01-15,ランニング,,3,"朝の,メモ"');
  });
});
