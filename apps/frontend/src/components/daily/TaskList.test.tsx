import type { DailyTask } from "@packages/frontend-shared/hooks/types";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TaskList } from "./TaskList";

vi.mock("@packages/i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../goal/activityHelpers", () => ({
  getActivityIcon: () => null,
}));

const makeTask = (overrides: Partial<DailyTask> = {}): DailyTask => ({
  id: "task-1",
  activityId: null,
  activityKindId: null,
  quantity: null,
  title: "Task",
  doneDate: null,
  memo: "",
  startDate: null,
  dueDate: null,
  ...overrides,
});

describe("daily TaskList リピートアイコン", () => {
  it("scheduleId を持つタスク（仮想・実体）にだけ繰り返しアイコンを出す", () => {
    render(
      <TaskList
        tasks={[
          makeTask({ id: "plain", title: "Plain" }),
          makeTask({
            id: "virtual",
            title: "Virtual",
            scheduleId: "schedule-1",
            isVirtual: true,
          }),
          makeTask({ id: "real", title: "Real", scheduleId: "schedule-1" }),
        ]}
        isLoading={false}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("img", { name: "card.repeat" })).toHaveLength(2);
    expect(screen.getByText("Plain")).toBeTruthy();
  });

  it("scheduleId が無ければアイコンを出さない", () => {
    render(
      <TaskList
        tasks={[makeTask({ scheduleId: null })]}
        isLoading={false}
        onToggle={vi.fn()}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.queryByRole("img", { name: "card.repeat" })).toBeNull();
  });
});

describe("daily TaskList の行タップ", () => {
  it("行をタップすると onEdit にそのタスクを渡す（モバイルと同じ挙動）", () => {
    const onEdit = vi.fn();
    const onToggle = vi.fn();
    const task = makeTask({ id: "task-9", title: "Edit me" });

    render(
      <TaskList
        tasks={[task]}
        isLoading={false}
        onToggle={onToggle}
        onEdit={onEdit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Edit me/ }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(task);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("仮想タスクの行タップでも onEdit に isVirtual 付きのまま渡す", () => {
    const onEdit = vi.fn();
    const virtual = makeTask({
      id: "virtual-1",
      title: "Virtual task",
      scheduleId: "schedule-1",
      isVirtual: true,
    });

    render(
      <TaskList
        tasks={[virtual]}
        isLoading={false}
        onToggle={vi.fn()}
        onEdit={onEdit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Virtual task/ }));

    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: "virtual-1", isVirtual: true }),
    );
  });

  it("完了トグルは onToggle だけを呼び、編集ダイアログを開かない", () => {
    const onEdit = vi.fn();
    const onToggle = vi.fn();
    const task = makeTask({ id: "task-3", title: "Toggle me" });

    render(
      <TaskList
        tasks={[task]}
        isLoading={false}
        onToggle={onToggle}
        onEdit={onEdit}
      />,
    );

    // トグルは名前を持たないアイコンボタン。行の編集ボタンとは別要素。
    const buttons = screen.getAllByRole("button");
    const toggleButton = buttons.find((b) => b.textContent === "");
    if (!toggleButton) throw new Error("toggle button not found");
    fireEvent.click(toggleButton);

    expect(onToggle).toHaveBeenCalledWith(task);
    expect(onEdit).not.toHaveBeenCalled();
  });
});
