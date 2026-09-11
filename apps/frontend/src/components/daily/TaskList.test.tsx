import type { DailyTask } from "@packages/frontend-shared/hooks/types";
import { render, screen } from "@testing-library/react";
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
      />,
    );
    expect(screen.queryByRole("img", { name: "card.repeat" })).toBeNull();
  });
});
