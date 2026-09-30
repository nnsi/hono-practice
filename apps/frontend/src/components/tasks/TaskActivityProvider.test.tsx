import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  activities: vi.fn(),
  kinds: vi.fn(),
}));
vi.mock("../../hooks/useActivities", () => ({
  useActivities: mocks.activities,
}));
vi.mock("dexie-react-hooks", () => ({ useLiveQuery: mocks.kinds }));
vi.mock("../../db/schema", () => ({ db: {} }));
vi.mock("@packages/i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { TaskActivityProvider } from "./TaskActivityProvider";
import { TaskCard } from "./TaskCard";
import { TaskScheduleRow } from "./TaskScheduleRow";
import type { TaskItem } from "./types";

const task: TaskItem = {
  id: "task",
  userId: "user",
  title: "Task",
  memo: "",
  activityId: "activity",
  activityKindId: "kind",
  quantity: 1,
  startDate: null,
  dueDate: null,
  doneDate: null,
  archivedAt: null,
  createdAt: "",
  updatedAt: "",
};
const noop = () => {};
function Rows({ count }: { count: number }) {
  return (
    <TaskActivityProvider>
      {Array.from({ length: count }, (_, i) => `task-${i}`).map((id) => (
        <TaskCard
          key={id}
          task={{ ...task, id }}
          onToggleDone={noop}
          onEdit={noop}
          onDelete={noop}
          onArchive={noop}
        />
      ))}
      <TaskScheduleRow
        schedule={{
          ...task,
          id: "schedule",
          recurrenceType: "interval",
          intervalDays: 1,
          weekdays: null,
          startDate: "2026-09-30",
          endDate: null,
          isActive: true,
          deletedAt: null,
        }}
        onEdit={noop}
        onToggleActive={noop}
        onDelete={noop}
      />
    </TaskActivityProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.activities.mockReturnValue({
    activities: [{ id: "activity", name: "Walk", emoji: "🚶" }],
  });
  mocks.kinds.mockReturnValue([
    { id: "kind", activityId: "activity", name: "Outside", deletedAt: null },
  ]);
});
afterEach(cleanup);

it("shares activity and kind subscriptions across cards and schedule rows", () => {
  const view = render(<Rows count={8} />);
  expect(screen.getAllByText(/Walk.*Outside/)).toHaveLength(8);
  expect(mocks.activities).toHaveBeenCalledTimes(1);
  expect(mocks.kinds).toHaveBeenCalledTimes(1);
  vi.clearAllMocks();
  view.rerender(<Rows count={12} />);
  expect(screen.getAllByText(/Walk.*Outside/)).toHaveLength(12);
  expect(mocks.activities).toHaveBeenCalledTimes(1);
  expect(mocks.kinds).toHaveBeenCalledTimes(1);
});

it("updates all rows and excludes deleted or mismatched kinds", () => {
  const view = render(<Rows count={2} />);
  mocks.activities.mockReturnValue({
    activities: [{ id: "activity", name: "Run", emoji: "🏃" }],
  });
  mocks.kinds.mockReturnValue([
    { id: "kind", activityId: "activity", name: "Track", deletedAt: null },
  ]);
  view.rerender(<Rows count={2} />);
  expect(screen.getAllByText(/Run.*Track/)).toHaveLength(2);
  expect(screen.queryByText(/Walk/)).toBeNull();
  for (const kind of [
    { id: "kind", activityId: "other", name: "Invalid", deletedAt: null },
    {
      id: "kind",
      activityId: "activity",
      name: "Invalid",
      deletedAt: "deleted",
    },
  ]) {
    mocks.kinds.mockReturnValue([kind]);
    view.rerender(<Rows count={2} />);
    expect(screen.queryByText(/Invalid/)).toBeNull();
  }
  mocks.activities.mockReturnValue({ activities: [] });
  view.rerender(<Rows count={2} />);
  expect(screen.queryByText(/Run/)).toBeNull();
});
