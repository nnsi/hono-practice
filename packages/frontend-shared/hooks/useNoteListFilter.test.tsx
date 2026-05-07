import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useNoteListFilter } from "./useNoteListFilter";

type TestNote = {
  id: string;
  title: string;
  content: string;
  activityId: string | null;
  updatedAt: string;
};

const FIXED_TODAY = new Date("2026-05-07T10:00:00");

function makeNote(overrides: Partial<TestNote> = {}): TestNote {
  return {
    id: "n1",
    title: "title",
    content: "content",
    activityId: null,
    updatedAt: "2026-05-07T08:00:00",
    ...overrides,
  };
}

describe("useNoteListFilter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("初期状態: 検索なし・activityフィルタなし・全件通過", () => {
    const notes: TestNote[] = [
      makeNote({ id: "a", title: "alpha" }),
      makeNote({ id: "b", title: "beta" }),
    ];
    const { result } = renderHook(() => useNoteListFilter(notes));

    expect(result.current.searchText).toBe("");
    expect(result.current.selectedActivityId).toBeNull();
    expect(result.current.hasActiveFilter).toBe(false);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.filteredNotes.map((n) => n.id)).toEqual(["a", "b"]);
  });

  describe("searchText", () => {
    it("title に含まれる文字列で絞り込み", () => {
      const notes: TestNote[] = [
        makeNote({ id: "a", title: "running diary" }),
        makeNote({ id: "b", title: "morning routine" }),
        makeNote({ id: "c", title: "shopping list" }),
      ];
      const { result } = renderHook(() => useNoteListFilter(notes));

      act(() => result.current.setSearchText("run"));

      expect(result.current.filteredNotes.map((n) => n.id)).toEqual(["a"]);
      expect(result.current.hasActiveFilter).toBe(true);
    });

    it("content にも一致する（title と OR）", () => {
      const notes: TestNote[] = [
        makeNote({ id: "a", title: "alpha", content: "no match" }),
        makeNote({ id: "b", title: "beta", content: "contains keyword here" }),
      ];
      const { result } = renderHook(() => useNoteListFilter(notes));

      act(() => result.current.setSearchText("keyword"));
      expect(result.current.filteredNotes.map((n) => n.id)).toEqual(["b"]);
    });

    it("大文字小文字を区別しない", () => {
      const notes: TestNote[] = [
        makeNote({ id: "a", title: "Running Diary" }),
        makeNote({ id: "b", title: "shopping" }),
      ];
      const { result } = renderHook(() => useNoteListFilter(notes));

      act(() => result.current.setSearchText("RUNNING"));
      expect(result.current.filteredNotes.map((n) => n.id)).toEqual(["a"]);
    });

    it("前後の空白は trim される（空白のみ → フィルタなし）", () => {
      const notes: TestNote[] = [
        makeNote({ id: "a", title: "alpha" }),
        makeNote({ id: "b", title: "beta" }),
      ];
      const { result } = renderHook(() => useNoteListFilter(notes));

      act(() => result.current.setSearchText("   "));
      expect(result.current.filteredNotes.map((n) => n.id)).toEqual(["a", "b"]);
      expect(result.current.hasActiveFilter).toBe(false);
    });

    it("空文字 → hasActiveFilter は false", () => {
      const notes: TestNote[] = [makeNote()];
      const { result } = renderHook(() => useNoteListFilter(notes));

      act(() => result.current.setSearchText("foo"));
      expect(result.current.hasActiveFilter).toBe(true);

      act(() => result.current.setSearchText(""));
      expect(result.current.hasActiveFilter).toBe(false);
    });
  });

  describe("selectedActivityId", () => {
    it("指定したactivityのみで絞り込み", () => {
      const notes: TestNote[] = [
        makeNote({ id: "a", activityId: "act1" }),
        makeNote({ id: "b", activityId: "act2" }),
        makeNote({ id: "c", activityId: "act1" }),
        makeNote({ id: "d", activityId: null }),
      ];
      const { result } = renderHook(() => useNoteListFilter(notes));

      act(() => result.current.setSelectedActivityId("act1"));
      expect(result.current.filteredNotes.map((n) => n.id)).toEqual(["a", "c"]);
      expect(result.current.hasActiveFilter).toBe(true);
    });

    it("選択中activityが notes から消えたら自動リセットされる", () => {
      let notes: TestNote[] = [
        makeNote({ id: "a", activityId: "act1" }),
        makeNote({ id: "b", activityId: "act2" }),
      ];
      const { result, rerender } = renderHook(
        ({ ns }) => useNoteListFilter(ns),
        {
          initialProps: { ns: notes },
        },
      );

      act(() => result.current.setSelectedActivityId("act1"));
      expect(result.current.selectedActivityId).toBe("act1");

      // act1 紐付き note を全削除 → 自動リセットされるべき
      notes = [makeNote({ id: "b", activityId: "act2" })];
      rerender({ ns: notes });

      expect(result.current.selectedActivityId).toBeNull();
      expect(result.current.hasActiveFilter).toBe(false);
    });

    it("stale な activity フィルタは即座に無視される（1フレームの空表示を防ぐ）", () => {
      // Why: useEffect での自動リセットは 1 フレーム遅れる。filteredNotes が
      // 同じレンダー内で stale な activityId で 0 件絞り込まれて一瞬空表示にならないことを検証。
      let notes: TestNote[] = [
        makeNote({ id: "a", activityId: "act1" }),
        makeNote({ id: "b", activityId: "act2" }),
      ];
      const { result, rerender } = renderHook(
        ({ ns }: { ns: TestNote[] }) => useNoteListFilter(ns),
        { initialProps: { ns: notes } },
      );

      act(() => result.current.setSelectedActivityId("act1"));
      expect(result.current.filteredNotes.map((n) => n.id)).toEqual(["a"]);

      // act1 紐付き note を全削除
      notes = [makeNote({ id: "b", activityId: "act2" })];
      rerender({ ns: notes });

      // 自動リセット完了後の最終状態: stale フィルタは無効化、全件表示
      expect(result.current.filteredNotes.map((n) => n.id)).toEqual(["b"]);
      expect(result.current.hasActiveFilter).toBe(false);
    });

    it("選択中activityがまだ残っていればリセットされない", () => {
      let notes: TestNote[] = [
        makeNote({ id: "a", activityId: "act1" }),
        makeNote({ id: "b", activityId: "act1" }),
      ];
      const { result, rerender } = renderHook(
        ({ ns }) => useNoteListFilter(ns),
        {
          initialProps: { ns: notes },
        },
      );

      act(() => result.current.setSelectedActivityId("act1"));

      // 1件削除しても act1 はまだ残る
      notes = [makeNote({ id: "b", activityId: "act1" })];
      rerender({ ns: notes });

      expect(result.current.selectedActivityId).toBe("act1");
    });
  });

  describe("AND 条件", () => {
    it("検索 × activity 両方一致する note のみ", () => {
      const notes: TestNote[] = [
        makeNote({ id: "a", title: "running", activityId: "act1" }),
        makeNote({ id: "b", title: "running", activityId: "act2" }),
        makeNote({ id: "c", title: "shopping", activityId: "act1" }),
      ];
      const { result } = renderHook(() => useNoteListFilter(notes));

      act(() => {
        result.current.setSearchText("running");
        result.current.setSelectedActivityId("act1");
      });

      expect(result.current.filteredNotes.map((n) => n.id)).toEqual(["a"]);
      expect(result.current.hasActiveFilter).toBe(true);
    });

    it("片方が一致しても両方一致しなければ除外", () => {
      // act1 を usedActivityIds に含めるため、検索に一致しない別noteを追加
      const notes: TestNote[] = [
        makeNote({ id: "a", title: "running", activityId: "act2" }),
        makeNote({ id: "x", title: "shopping", activityId: "act1" }),
      ];
      const { result } = renderHook(() => useNoteListFilter(notes));

      act(() => {
        result.current.setSearchText("running");
        result.current.setSelectedActivityId("act1");
      });
      // running × act1 で両方一致するnoteはなし
      expect(result.current.filteredNotes).toHaveLength(0);
    });
  });

  describe("groupedNotes", () => {
    it("日付セクションに正しく振り分けられる", () => {
      const notes: TestNote[] = [
        makeNote({ id: "today1", updatedAt: "2026-05-07T08:00:00" }),
        makeNote({ id: "yesterday1", updatedAt: "2026-05-06T20:00:00" }),
        makeNote({ id: "older1", updatedAt: "2026-01-01T12:00:00" }),
      ];
      const { result } = renderHook(() => useNoteListFilter(notes));

      expect(result.current.groupedNotes.today.map((n) => n.id)).toEqual([
        "today1",
      ]);
      expect(result.current.groupedNotes.yesterday.map((n) => n.id)).toEqual([
        "yesterday1",
      ]);
      expect(result.current.groupedNotes.older.map((n) => n.id)).toEqual([
        "older1",
      ]);
    });

    it("検索フィルタがグルーピングに反映される", () => {
      const notes: TestNote[] = [
        makeNote({ id: "a", title: "alpha", updatedAt: "2026-05-07T08:00:00" }),
        makeNote({ id: "b", title: "beta", updatedAt: "2026-05-06T20:00:00" }),
      ];
      const { result } = renderHook(() => useNoteListFilter(notes));

      act(() => result.current.setSearchText("alpha"));
      expect(result.current.groupedNotes.today.map((n) => n.id)).toEqual(["a"]);
      expect(result.current.groupedNotes.yesterday).toEqual([]);
    });
  });

  it("totalCount は フィルタに関係なく notes.length を返す", () => {
    const notes: TestNote[] = [
      makeNote({ id: "a", title: "alpha" }),
      makeNote({ id: "b", title: "beta" }),
      makeNote({ id: "c", title: "gamma" }),
    ];
    const { result } = renderHook(() => useNoteListFilter(notes));

    act(() => result.current.setSearchText("alpha"));
    expect(result.current.filteredNotes).toHaveLength(1);
    expect(result.current.totalCount).toBe(3);
  });
});
