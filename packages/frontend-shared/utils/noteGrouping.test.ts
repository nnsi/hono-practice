import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { groupNotesByDate } from "./noteGrouping";

const FIXED_TODAY = new Date("2026-05-07T10:00:00");

type TestNote = { id: string; updatedAt: string };

function createNote(id: string, updatedAt: string): TestNote {
  return { id, updatedAt };
}

describe("groupNotesByDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("空配列 → 全セクションが空", () => {
    const result = groupNotesByDate([]);
    expect(result.today).toEqual([]);
    expect(result.yesterday).toEqual([]);
    expect(result.thisWeek).toEqual([]);
    expect(result.thisMonth).toEqual([]);
    expect(result.older).toEqual([]);
  });

  it("今日の00:01 → today", () => {
    const note = createNote("n1", "2026-05-07T00:01:00");
    const result = groupNotesByDate([note]);
    expect(result.today.map((n) => n.id)).toEqual(["n1"]);
  });

  it("今日の23:59 → today", () => {
    const note = createNote("n1", "2026-05-07T23:59:00");
    const result = groupNotesByDate([note]);
    expect(result.today.map((n) => n.id)).toEqual(["n1"]);
  });

  it("昨日 → yesterday", () => {
    const note = createNote("n1", "2026-05-06T15:00:00");
    const result = groupNotesByDate([note]);
    expect(result.yesterday.map((n) => n.id)).toEqual(["n1"]);
  });

  it("2日前 → thisWeek", () => {
    const note = createNote("n1", "2026-05-05T10:00:00");
    const result = groupNotesByDate([note]);
    expect(result.thisWeek.map((n) => n.id)).toEqual(["n1"]);
  });

  it("6日前 → thisWeek（境界）", () => {
    const note = createNote("n1", "2026-05-01T10:00:00");
    const result = groupNotesByDate([note]);
    expect(result.thisWeek.map((n) => n.id)).toEqual(["n1"]);
  });

  it("7日前 → thisMonth（境界）", () => {
    const note = createNote("n1", "2026-04-30T10:00:00");
    const result = groupNotesByDate([note]);
    expect(result.thisMonth.map((n) => n.id)).toEqual(["n1"]);
  });

  it("29日前 → thisMonth（境界）", () => {
    const note = createNote("n1", "2026-04-08T10:00:00");
    const result = groupNotesByDate([note]);
    expect(result.thisMonth.map((n) => n.id)).toEqual(["n1"]);
  });

  it("30日前 → older（境界）", () => {
    const note = createNote("n1", "2026-04-07T10:00:00");
    const result = groupNotesByDate([note]);
    expect(result.older.map((n) => n.id)).toEqual(["n1"]);
  });

  it("1年前 → older", () => {
    const note = createNote("n1", "2025-05-07T10:00:00");
    const result = groupNotesByDate([note]);
    expect(result.older.map((n) => n.id)).toEqual(["n1"]);
  });

  it("未来日付 → today（クロックスキュー耐性）", () => {
    const note = createNote("n1", "2026-05-08T10:00:00");
    const result = groupNotesByDate([note]);
    expect(result.today.map((n) => n.id)).toEqual(["n1"]);
  });

  it("混在: 各セクションに正しく分配される", () => {
    const notes: TestNote[] = [
      createNote("today1", "2026-05-07T08:00:00"),
      createNote("yesterday1", "2026-05-06T20:00:00"),
      createNote("thisWeek1", "2026-05-03T12:00:00"),
      createNote("thisMonth1", "2026-04-20T12:00:00"),
      createNote("older1", "2026-01-01T12:00:00"),
      createNote("today2", "2026-05-07T22:00:00"),
    ];
    const result = groupNotesByDate(notes);
    expect(result.today.map((n) => n.id)).toEqual(["today1", "today2"]);
    expect(result.yesterday.map((n) => n.id)).toEqual(["yesterday1"]);
    expect(result.thisWeek.map((n) => n.id)).toEqual(["thisWeek1"]);
    expect(result.thisMonth.map((n) => n.id)).toEqual(["thisMonth1"]);
    expect(result.older.map((n) => n.id)).toEqual(["older1"]);
  });

  it("入力順がセクション内で維持される", () => {
    const notes: TestNote[] = [
      createNote("a", "2026-05-07T22:00:00"),
      createNote("b", "2026-05-07T08:00:00"),
      createNote("c", "2026-05-07T15:00:00"),
    ];
    const result = groupNotesByDate(notes);
    expect(result.today.map((n) => n.id)).toEqual(["a", "b", "c"]);
  });

  it("now を引数で上書きできる（テスト容易性）", () => {
    const note = createNote("n1", "2026-01-01T10:00:00");
    const result = groupNotesByDate([note], new Date("2026-01-01T15:00:00"));
    expect(result.today.map((n) => n.id)).toEqual(["n1"]);
  });
});
