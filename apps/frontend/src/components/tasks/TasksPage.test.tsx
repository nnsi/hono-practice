import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TasksPage } from "./TasksPage";
import type { GroupedTasks, TaskItem } from "./types";

const mockUseTasksPage = vi.fn();

vi.mock("@packages/i18n", () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count?: number }) =>
      params?.count === undefined ? key : `${key}:${params.count}`,
  }),
}));

vi.mock("./useTasksPage", () => ({
  useTasksPage: () => mockUseTasksPage(),
}));

vi.mock("./TaskGroup", () => ({
  TaskGroup: ({ title, tasks }: { title: string; tasks: TaskItem[] }) => (
    <div>{`${title}:${tasks.length}`}</div>
  ),
}));

vi.mock("./TaskCreateDialog", () => ({
  TaskCreateDialog: () => <div>task-create-dialog</div>,
}));

vi.mock("./TaskEditDialog", () => ({
  TaskEditDialog: () => <div>task-edit-dialog</div>,
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

describe("TasksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wires tab switches, toggles, and dialogs through the split components", () => {
    const setActiveTab = vi.fn();
    const setShowFuture = vi.fn();
    const setShowCompleted = vi.fn();
    const setCreateDialogOpen = vi.fn();
    const setEditingTask = vi.fn();
    const setDeleteConfirmId = vi.fn();

    const archivedTask = createTask({
      id: "archived-1",
      title: "Archived task",
      archivedAt: "2026-04-02T00:00:00.000Z",
    });

    mockUseTasksPage.mockReturnValue({
      activeTab: "active",
      setActiveTab,
      showCompleted: false,
      setShowCompleted,
      showFuture: false,
      setShowFuture,
      tasks: [createTask()],
      archivedTasks: [archivedTask],
      groupedTasks: createGroupedTasks({
        overdue: [createTask()],
        future: [createTask({ id: "future-1", title: "Future task" })],
        completed: [createTask({ id: "done-1", title: "Done task" })],
      }),
      completedCount: 1,
      futureCount: 1,
      hasAnyTasks: true,
      createDialogOpen: true,
      setCreateDialogOpen,
      editingTask: createTask({ id: "edit-1", title: "Editing task" }),
      setEditingTask,
      deleteConfirmId: "archived-1",
      setDeleteConfirmId,
      handleToggleDone: vi.fn(),
      handleDelete: vi.fn(),
      handleArchive: vi.fn(),
      handleMoveToToday: vi.fn(),
      handleCreateSuccess: vi.fn(),
      handleEditSuccess: vi.fn(),
    });

    render(<TasksPage />);

    fireEvent.click(screen.getByRole("button", { name: "page.tab.archived" }));
    fireEvent.click(
      screen.getByRole("button", { name: "page.toggle.futureShow:1" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "page.toggle.completedShow:1" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "page.addNew" }));

    expect(setActiveTab).toHaveBeenCalledWith("archived");
    expect(setShowFuture).toHaveBeenCalledWith(true);
    expect(setShowCompleted).toHaveBeenCalledWith(true);
    expect(setCreateDialogOpen).toHaveBeenCalledWith(true);
    expect(screen.getByText("task-create-dialog")).toBeTruthy();
    expect(screen.getByText("task-edit-dialog")).toBeTruthy();
    expect(
      screen.getByText("delete-confirm-dialog:Archived task"),
    ).toBeTruthy();
  });

  it("shows the empty state action when no active tasks exist", () => {
    const setCreateDialogOpen = vi.fn();

    mockUseTasksPage.mockReturnValue({
      activeTab: "active",
      setActiveTab: vi.fn(),
      showCompleted: false,
      setShowCompleted: vi.fn(),
      showFuture: false,
      setShowFuture: vi.fn(),
      tasks: [],
      archivedTasks: [],
      groupedTasks: createGroupedTasks(),
      completedCount: 0,
      futureCount: 0,
      hasAnyTasks: false,
      createDialogOpen: false,
      setCreateDialogOpen,
      editingTask: null,
      setEditingTask: vi.fn(),
      deleteConfirmId: null,
      setDeleteConfirmId: vi.fn(),
      handleToggleDone: vi.fn(),
      handleDelete: vi.fn(),
      handleArchive: vi.fn(),
      handleMoveToToday: vi.fn(),
      handleCreateSuccess: vi.fn(),
      handleEditSuccess: vi.fn(),
    });

    render(<TasksPage />);

    fireEvent.click(screen.getByRole("button", { name: "page.firstTask" }));

    expect(screen.getByText("page.empty")).toBeTruthy();
    expect(setCreateDialogOpen).toHaveBeenCalledWith(true);
  });
});
