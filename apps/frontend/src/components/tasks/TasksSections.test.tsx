import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TasksActiveSection } from "./TasksActiveSection";
import { TasksArchivedSection } from "./TasksArchivedSection";
import { TasksDialogs } from "./TasksDialogs";
import { TasksTabs } from "./TasksTabs";
import type { GroupedTasks, TaskItem } from "./types";

vi.mock("@packages/i18n", () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count?: number }) =>
      params?.count === undefined ? key : `${key}:${params.count}`,
  }),
}));

vi.mock("./TaskGroup", () => ({
  TaskGroup: ({
    title,
    tasks,
    archived,
    completed,
  }: {
    title: string;
    tasks: TaskItem[];
    archived?: boolean;
    completed?: boolean;
  }) => (
    <div>{`${title}:${tasks.length}:${archived ? "archived" : completed ? "completed" : "active"}`}</div>
  ),
}));

vi.mock("./TaskCreateDialog", () => ({
  TaskCreateDialog: () => <div>task-create-dialog</div>,
}));

vi.mock("./TaskEditDialog", () => ({
  TaskEditDialog: ({ task }: { task: TaskItem }) => (
    <div>{`task-edit-dialog:${task.title}`}</div>
  ),
}));

vi.mock("./DeleteConfirmDialog", () => ({
  DeleteConfirmDialog: ({ taskTitle }: { taskTitle: string }) => (
    <div>{`delete-confirm-dialog:${taskTitle}`}</div>
  ),
}));

function createTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: "task-1",
    userId: "user-1",
    activityId: null,
    activityKindId: null,
    quantity: null,
    title: "Task 1",
    startDate: null,
    dueDate: null,
    doneDate: null,
    memo: "",
    archivedAt: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

function createGroupedTasks(
  overrides: Partial<GroupedTasks> = {},
): GroupedTasks {
  return {
    overdue: [],
    dueToday: [],
    startingToday: [],
    inProgress: [],
    dueThisWeek: [],
    notStarted: [],
    future: [],
    completed: [],
    ...overrides,
  };
}

const handlers = {
  onToggleDone: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onArchive: vi.fn(),
  onMoveToToday: vi.fn(),
};

describe("split task view components", () => {
  it("renders future and completed branches after rerender", () => {
    const onToggleFuture = vi.fn();
    const onToggleCompleted = vi.fn();
    const onOpenCreate = vi.fn();

    const groupedTasks = createGroupedTasks({
      notStarted: [createTask({ id: "not-started-1", title: "Not started" })],
      future: [createTask({ id: "future-1", title: "Future" })],
      completed: [
        createTask({ id: "done-1", title: "Done", doneDate: "2026-04-01" }),
      ],
    });

    const { rerender } = render(
      <TasksActiveSection
        {...handlers}
        groupedTasks={groupedTasks}
        futureCount={2}
        completedCount={1}
        hasAnyTasks
        showFuture={false}
        showCompleted={false}
        onToggleFuture={onToggleFuture}
        onToggleCompleted={onToggleCompleted}
        onOpenCreate={onOpenCreate}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "page.toggle.futureShow:2" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "page.toggle.completedShow:1" }),
    );
    expect(onToggleFuture).toHaveBeenCalledWith(true);
    expect(onToggleCompleted).toHaveBeenCalledWith(true);

    rerender(
      <TasksActiveSection
        {...handlers}
        groupedTasks={groupedTasks}
        futureCount={2}
        completedCount={1}
        hasAnyTasks
        showFuture
        showCompleted
        onToggleFuture={onToggleFuture}
        onToggleCompleted={onToggleCompleted}
        onOpenCreate={onOpenCreate}
      />,
    );

    expect(screen.getByText("page.group.notStarted:1:active")).toBeTruthy();
    expect(screen.getByText("page.group.future:1:active")).toBeTruthy();
    expect(screen.getByText("page.group.completed:1:completed")).toBeTruthy();
  });

  it("renders archived empty state and archived task group", () => {
    const { rerender } = render(
      <TasksArchivedSection {...handlers} archivedTasks={[]} />,
    );

    expect(screen.getByText("page.empty.archived")).toBeTruthy();

    rerender(
      <TasksArchivedSection
        {...handlers}
        archivedTasks={[
          createTask({ id: "archived-1", archivedAt: "2026-04-02" }),
        ]}
      />,
    );

    expect(screen.getByText("page.tab.archived:1:archived")).toBeTruthy();
  });

  it("renders dialog branches and tab state branches", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <>
        <TasksTabs activeTab="active" onChange={onChange} />
        <TasksDialogs
          createDialogOpen={false}
          onCloseCreate={vi.fn()}
          onCreateSuccess={vi.fn()}
          editingTask={null}
          onCloseEdit={vi.fn()}
          onEditSuccess={vi.fn()}
          onDeleteFromEdit={vi.fn()}
          deleteConfirmId={null}
          deleteTaskTitle=""
          onConfirmDelete={vi.fn()}
          onCancelDelete={vi.fn()}
        />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "page.tab.archived" }));
    expect(onChange).toHaveBeenCalledWith("archived");

    rerender(
      <>
        <TasksTabs activeTab="archived" onChange={onChange} />
        <TasksDialogs
          createDialogOpen
          onCloseCreate={vi.fn()}
          onCreateSuccess={vi.fn()}
          editingTask={createTask({ id: "edit-1", title: "Editing task" })}
          onCloseEdit={vi.fn()}
          onEditSuccess={vi.fn()}
          onDeleteFromEdit={vi.fn()}
          deleteConfirmId="delete-1"
          deleteTaskTitle="Delete target"
          onConfirmDelete={vi.fn()}
          onCancelDelete={vi.fn()}
        />
      </>,
    );

    expect(screen.getByText("task-create-dialog")).toBeTruthy();
    expect(screen.getByText("task-edit-dialog:Editing task")).toBeTruthy();
    expect(
      screen.getByText("delete-confirm-dialog:Delete target"),
    ).toBeTruthy();
  });
});
