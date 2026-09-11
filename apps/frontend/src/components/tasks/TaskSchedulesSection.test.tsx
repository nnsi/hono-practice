import type { TaskScheduleRecord } from "@packages/domain/taskSchedule";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskSchedulesSection } from "./TaskSchedulesSection";

const mockUseTaskSchedulesTab = vi.fn();

vi.mock("@packages/i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("./useTaskSchedulesTab", () => ({
  useTaskSchedulesTab: () => mockUseTaskSchedulesTab(),
}));

vi.mock("./TaskScheduleRow", () => ({
  TaskScheduleRow: ({
    schedule,
    onEdit,
    onToggleActive,
    onDelete,
  }: {
    schedule: TaskScheduleRecord;
    onEdit: () => void;
    onToggleActive: () => void;
    onDelete: () => void;
  }) => (
    <div>
      <span>{`row:${schedule.id}:${schedule.isActive}`}</span>
      <button type="button" onClick={onEdit}>{`edit:${schedule.id}`}</button>
      <button type="button" onClick={onToggleActive}>
        {`toggle:${schedule.id}`}
      </button>
      <button
        type="button"
        onClick={onDelete}
      >{`delete:${schedule.id}`}</button>
    </div>
  ),
}));

vi.mock("./TaskScheduleEditDialog", () => ({
  TaskScheduleEditDialog: ({ schedule }: { schedule: TaskScheduleRecord }) => (
    <div>{`edit-dialog:${schedule.id}`}</div>
  ),
}));

vi.mock("./DeleteConfirmDialog", () => ({
  DeleteConfirmDialog: ({
    taskTitle,
    variant,
    onConfirm,
  }: {
    taskTitle: string;
    variant: string;
    onConfirm: () => void;
  }) => (
    <button type="button" onClick={onConfirm}>
      {`delete-dialog:${variant}:${taskTitle}`}
    </button>
  ),
}));

const schedule: TaskScheduleRecord = {
  id: "sch-1",
  userId: "u",
  activityId: null,
  activityKindId: null,
  quantity: null,
  title: "筋トレ",
  memo: "",
  recurrenceType: "interval",
  intervalDays: 2,
  weekdays: null,
  startDate: "2026-09-10",
  endDate: null,
  isActive: true,
  createdAt: "",
  updatedAt: "",
  deletedAt: null,
};

const baseState = () => ({
  schedules: [schedule],
  editingSchedule: null,
  setEditingSchedule: vi.fn(),
  deleteConfirmId: null,
  setDeleteConfirmId: vi.fn(),
  deleteTarget: null,
  handleToggleActive: vi.fn(),
  handleDelete: vi.fn(),
  handleEditSuccess: vi.fn(),
});

describe("TaskSchedulesSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("空のときは案内文を出す", () => {
    mockUseTaskSchedulesTab.mockReturnValue({ ...baseState(), schedules: [] });
    render(<TaskSchedulesSection />);
    expect(screen.getByText("page.empty.schedules")).toBeTruthy();
  });

  it("行の操作を hook に配線する", () => {
    const state = baseState();
    mockUseTaskSchedulesTab.mockReturnValue(state);
    render(<TaskSchedulesSection />);
    expect(screen.getByText("row:sch-1:true")).toBeTruthy();

    fireEvent.click(screen.getByText("edit:sch-1"));
    expect(state.setEditingSchedule).toHaveBeenCalledWith(schedule);
    fireEvent.click(screen.getByText("toggle:sch-1"));
    expect(state.handleToggleActive).toHaveBeenCalledWith(schedule);
    fireEvent.click(screen.getByText("delete:sch-1"));
    expect(state.setDeleteConfirmId).toHaveBeenCalledWith("sch-1");
  });

  it("削除確認は schedule variant で出し、確定で handleDelete を呼ぶ", () => {
    const state = {
      ...baseState(),
      deleteConfirmId: "sch-1",
      deleteTarget: schedule,
      editingSchedule: schedule,
    };
    mockUseTaskSchedulesTab.mockReturnValue(state);
    render(<TaskSchedulesSection />);
    expect(screen.getByText("edit-dialog:sch-1")).toBeTruthy();
    fireEvent.click(screen.getByText("delete-dialog:schedule:筋トレ"));
    expect(state.handleDelete).toHaveBeenCalledWith("sch-1");
  });
});
