import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

vi.mock("@packages/i18n", () => ({
  useTranslation: () => ({
    t: (key: string, params?: { taskTitle?: string }) =>
      params?.taskTitle ? `${key}:${params.taskTitle}` : key,
  }),
}));

describe("DeleteConfirmDialog", () => {
  it("通常のタスクは削除の文言を出す", () => {
    render(
      <DeleteConfirmDialog
        taskTitle="Real"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("delete.title")).toBeTruthy();
    expect(screen.getByText("delete.description:Real")).toBeTruthy();
    expect(screen.getByText("delete.confirm")).toBeTruthy();
  });

  it("仮想タスク（skipToday）は「今日はやらない」の文言に切り替わり、確定で onConfirm を呼ぶ", () => {
    const onConfirm = vi.fn();
    render(
      <DeleteConfirmDialog
        taskTitle="Bench press"
        variant="skipToday"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("delete.skipToday.title")).toBeTruthy();
    expect(
      screen.getByText("delete.skipToday.description:Bench press"),
    ).toBeTruthy();
    expect(screen.queryByText("delete.title")).toBeNull();

    fireEvent.click(screen.getByText("delete.skipToday.confirm"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("繰り返し（schedule）は「完了済みの記録は残る」文言に切り替わる", () => {
    render(
      <DeleteConfirmDialog
        taskTitle="Squat"
        variant="schedule"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("delete.schedule.title")).toBeTruthy();
    expect(screen.getByText("delete.schedule.description:Squat")).toBeTruthy();
    expect(screen.getByText("delete.schedule.confirm")).toBeTruthy();
  });
});
