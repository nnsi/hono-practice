import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { groupTasksByTimeline } from "./taskGrouping";
import type { TaskItem } from "./types";

// テスト用の「今日」を 2025-06-15 に固定
const FIXED_TODAY = new Date("2025-06-15T00:00:00");

function createTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: "task-1",
    userId: "user-1",
    title: "Test Task",
    startDate: null,
    dueDate: null,
    doneDate: null,
    memo: "",
    archivedAt: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("groupTasksByTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultOptions = { showCompleted: true, showFuture: true };

  it("空のタスクリスト → 全グループが空", () => {
    const result = groupTasksByTimeline([], defaultOptions);
    for (const key of Object.keys(result) as (keyof typeof result)[]) {
      expect(result[key]).toEqual([]);
    }
  });

  // --- 期限切れ ---
  it("dueDate が今日より前 → overdue", () => {
    const task = createTask({ id: "t1", dueDate: "2025-06-10" });
    const result = groupTasksByTimeline([task], defaultOptions);
    expect(result.overdue).toHaveLength(1);
    expect(result.overdue[0].id).toBe("t1");
  });

  // --- 今日が期限 ---
  it("dueDate が今日 → dueToday", () => {
    const task = createTask({ id: "t2", dueDate: "2025-06-15" });
    const result = groupTasksByTimeline([task], defaultOptions);
    expect(result.dueToday).toHaveLength(1);
    expect(result.dueToday[0].id).toBe("t2");
  });

  // --- 今日開始 ---
  it("startDate が今日・dueDate なし → startingToday", () => {
    const task = createTask({ id: "t3", startDate: "2025-06-15" });
    const result = groupTasksByTimeline([task], defaultOptions);
    expect(result.startingToday).toHaveLength(1);
    expect(result.startingToday[0].id).toBe("t3");
  });

  it("startDate が今日・dueDate が未来 → startingToday", () => {
    const task = createTask({
      id: "t3b",
      startDate: "2025-06-15",
      dueDate: "2025-06-20",
    });
    const result = groupTasksByTimeline([task], defaultOptions);
    expect(result.startingToday).toHaveLength(1);
    expect(result.startingToday[0].id).toBe("t3b");
  });

  // --- 進行中 ---
  it("startDate が過去・dueDate が未来 → inProgress", () => {
    const task = createTask({
      id: "t4",
      startDate: "2025-06-10",
      dueDate: "2025-06-20",
    });
    const result = groupTasksByTimeline([task], defaultOptions);
    expect(result.inProgress).toHaveLength(1);
    expect(result.inProgress[0].id).toBe("t4");
  });

  it("startDate が過去・dueDate なし → inProgress", () => {
    const task = createTask({ id: "t4b", startDate: "2025-06-10" });
    const result = groupTasksByTimeline([task], defaultOptions);
    expect(result.inProgress).toHaveLength(1);
    expect(result.inProgress[0].id).toBe("t4b");
  });

  // --- 今週中が期限 ---
  it("dueDate が3日後（今週中）→ dueThisWeek", () => {
    const task = createTask({ id: "t5", dueDate: "2025-06-18" });
    const result = groupTasksByTimeline([task], defaultOptions);
    expect(result.dueThisWeek).toHaveLength(1);
    expect(result.dueThisWeek[0].id).toBe("t5");
  });

  // --- 未着手 ---
  it("startDate が未来 → notStarted", () => {
    const task = createTask({ id: "t6", startDate: "2025-06-20" });
    const result = groupTasksByTimeline([task], defaultOptions);
    expect(result.notStarted).toHaveLength(1);
    expect(result.notStarted[0].id).toBe("t6");
  });

  // --- 日付なしのタスク ---
  it("日付なし・showFuture=true → future", () => {
    const task = createTask({ id: "t7" });
    const result = groupTasksByTimeline([task], {
      showCompleted: true,
      showFuture: true,
    });
    expect(result.future).toHaveLength(1);
    expect(result.future[0].id).toBe("t7");
  });

  it("日付なし・showFuture=false → inProgress", () => {
    const task = createTask({ id: "t8" });
    const result = groupTasksByTimeline([task], {
      showCompleted: true,
      showFuture: false,
    });
    expect(result.inProgress).toHaveLength(1);
    expect(result.inProgress[0].id).toBe("t8");
  });

  // --- 完了タスク ---
  it("完了タスク・showCompleted=true → completed", () => {
    const task = createTask({ id: "t9", doneDate: "2025-06-14" });
    const result = groupTasksByTimeline([task], {
      showCompleted: true,
      showFuture: true,
    });
    expect(result.completed).toHaveLength(1);
    expect(result.completed[0].id).toBe("t9");
  });

  it("完了タスク・showCompleted=false → どのグループにも含まれない", () => {
    const task = createTask({ id: "t10", doneDate: "2025-06-14" });
    const result = groupTasksByTimeline([task], {
      showCompleted: false,
      showFuture: true,
    });
    for (const key of Object.keys(result) as (keyof typeof result)[]) {
      expect(result[key]).toHaveLength(0);
    }
  });

  // --- completedInTheirCategories ---
  it("completedInTheirCategories: 完了タスク・dueDate=今日 → dueToday", () => {
    const task = createTask({
      id: "t11",
      dueDate: "2025-06-15",
      doneDate: "2025-06-15",
    });
    const result = groupTasksByTimeline([task], {
      showCompleted: true,
      showFuture: true,
      completedInTheirCategories: true,
    });
    expect(result.dueToday).toHaveLength(1);
    expect(result.dueToday[0].id).toBe("t11");
    expect(result.completed).toHaveLength(0);
  });

  it("completedInTheirCategories: 完了タスク・startDate=今日 → startingToday", () => {
    const task = createTask({
      id: "t12",
      startDate: "2025-06-15",
      doneDate: "2025-06-15",
    });
    const result = groupTasksByTimeline([task], {
      showCompleted: true,
      showFuture: true,
      completedInTheirCategories: true,
    });
    expect(result.startingToday).toHaveLength(1);
    expect(result.startingToday[0].id).toBe("t12");
    expect(result.completed).toHaveLength(0);
  });

  it("completedInTheirCategories: 完了タスク・日付がカテゴリに一致しない → completed", () => {
    const task = createTask({
      id: "t13",
      dueDate: "2025-06-10",
      doneDate: "2025-06-14",
    });
    const result = groupTasksByTimeline([task], {
      showCompleted: true,
      showFuture: true,
      completedInTheirCategories: true,
    });
    expect(result.completed).toHaveLength(1);
    expect(result.completed[0].id).toBe("t13");
  });

  // --- ソート ---
  it("グループ内でdueDate順にソートされる", () => {
    const tasks = [
      createTask({ id: "late", dueDate: "2025-06-19" }),
      createTask({ id: "early", dueDate: "2025-06-16" }),
      createTask({ id: "mid", dueDate: "2025-06-17" }),
    ];
    const result = groupTasksByTimeline(tasks, defaultOptions);
    expect(result.dueThisWeek.map((t) => t.id)).toEqual([
      "early",
      "mid",
      "late",
    ]);
  });

  it("dueDate がないタスクは startDate でソートされる", () => {
    const tasks = [
      createTask({ id: "b", startDate: "2025-06-25" }),
      createTask({ id: "a", startDate: "2025-06-20" }),
    ];
    const result = groupTasksByTimeline(tasks, defaultOptions);
    expect(result.notStarted.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("日付がないタスクはソートの最後に来る", () => {
    // dueDate が nextWeek(6/22) より後 → startDate なし → showFuture → future
    // 日付なしタスクも future に分類される
    const tasks = [
      createTask({ id: "no-date" }),
      createTask({ id: "has-due", dueDate: "2025-07-01" }),
    ];
    const result = groupTasksByTimeline(tasks, {
      showCompleted: true,
      showFuture: true,
    });
    // has-due は dueDate でソートされ先に来る、no-date は後ろ
    expect(result.future.map((t) => t.id)).toEqual(["has-due", "no-date"]);
  });

  // --- 複数タスクの複合テスト ---
  it("複数タスクがそれぞれ正しいグループに分類される", () => {
    const tasks = [
      createTask({ id: "overdue", dueDate: "2025-06-10" }),
      createTask({ id: "today", dueDate: "2025-06-15" }),
      createTask({ id: "starting", startDate: "2025-06-15" }),
      createTask({
        id: "progress",
        startDate: "2025-06-01",
        dueDate: "2025-06-20",
      }),
      createTask({ id: "this-week", dueDate: "2025-06-18" }),
      createTask({ id: "not-started", startDate: "2025-06-20" }),
      createTask({ id: "done", doneDate: "2025-06-14" }),
      createTask({ id: "no-dates" }),
    ];
    const result = groupTasksByTimeline(tasks, defaultOptions);
    expect(result.overdue.map((t) => t.id)).toEqual(["overdue"]);
    expect(result.dueToday.map((t) => t.id)).toEqual(["today"]);
    expect(result.startingToday.map((t) => t.id)).toEqual(["starting"]);
    expect(result.inProgress.map((t) => t.id)).toEqual(["progress"]);
    expect(result.dueThisWeek.map((t) => t.id)).toEqual(["this-week"]);
    expect(result.notStarted.map((t) => t.id)).toEqual(["not-started"]);
    expect(result.completed.map((t) => t.id)).toEqual(["done"]);
    expect(result.future.map((t) => t.id)).toEqual(["no-dates"]);
  });

  // --- 境界値テスト ---
  it("dueDate が明日（今週中）→ dueThisWeek", () => {
    const task = createTask({ id: "tomorrow", dueDate: "2025-06-16" });
    const result = groupTasksByTimeline([task], defaultOptions);
    expect(result.dueThisWeek).toHaveLength(1);
  });

  it("dueDate がちょうど7日後 → dueThisWeek に含まれない（isBefore なので）", () => {
    // nextWeek = today + 7 = 2025-06-22
    // isBefore(nextWeek) なので 6/22 は含まれない
    const task = createTask({ id: "week-boundary", dueDate: "2025-06-22" });
    const result = groupTasksByTimeline([task], defaultOptions);
    expect(result.dueThisWeek).toHaveLength(0);
    // startDate がないので → showFuture=true → future
    expect(result.future).toHaveLength(1);
  });

  it("dueDate が6日後 → dueThisWeek", () => {
    const task = createTask({ id: "6days", dueDate: "2025-06-21" });
    const result = groupTasksByTimeline([task], defaultOptions);
    expect(result.dueThisWeek).toHaveLength(1);
  });

  // startDate=今日 かつ dueDate=今日 → dueDateが優先されdueTodayになる
  it("startDate=今日 かつ dueDate=今日 → dueToday（dueDateの条件が先に評価される）", () => {
    const task = createTask({
      id: "both-today",
      startDate: "2025-06-15",
      dueDate: "2025-06-15",
    });
    const result = groupTasksByTimeline([task], defaultOptions);
    expect(result.dueToday).toHaveLength(1);
    expect(result.startingToday).toHaveLength(0);
  });
});
