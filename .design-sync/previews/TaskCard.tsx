import { TaskCard } from "actiko-frontend";

// TaskCard is a full-width row with checkbox + action buttons; mobile-width column.
// Note: linked activity/kind are resolved from local Dexie inside the component,
// which is empty in preview — so stories vary by props that render statically
// (title, dates, memo, completed/highlight/archived flags).
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 340 }}>{children}</div>;
}

const baseTask = {
  id: "task-1",
  userId: "user-1",
  activityId: null,
  activityKindId: null,
  quantity: null,
  title: "週次レビューを書く",
  startDate: "2026-06-15",
  dueDate: "2026-06-20",
  doneDate: null,
  memo: "今週の活動を振り返ってまとめる",
  archivedAt: null,
  createdAt: "2026-06-15T00:00:00.000Z",
  updatedAt: "2026-06-15T00:00:00.000Z",
};

const noop = () => {};

export function Default() {
  return (
    <Frame>
      <TaskCard
        task={baseTask}
        onToggleDone={noop}
        onEdit={noop}
        onDelete={noop}
        onArchive={noop}
      />
    </Frame>
  );
}

export function Overdue() {
  return (
    <Frame>
      <TaskCard
        task={{
          ...baseTask,
          id: "task-2",
          title: "請求書を送付する",
          startDate: "2026-06-10",
          dueDate: "2026-06-14",
          memo: "",
        }}
        highlight
        onToggleDone={noop}
        onEdit={noop}
        onDelete={noop}
        onArchive={noop}
      />
    </Frame>
  );
}

export function Completed() {
  return (
    <Frame>
      <TaskCard
        task={{
          ...baseTask,
          id: "task-3",
          title: "朝のランニング 30分",
          startDate: "2026-06-18",
          dueDate: "2026-06-18",
          doneDate: "2026-06-18",
          memo: "",
        }}
        completed
        onToggleDone={noop}
        onEdit={noop}
        onDelete={noop}
        onArchive={noop}
      />
    </Frame>
  );
}

export function Archived() {
  return (
    <Frame>
      <TaskCard
        task={{
          ...baseTask,
          id: "task-4",
          title: "確定申告の書類を整理する",
          startDate: "2026-05-01",
          dueDate: "2026-05-31",
          doneDate: "2026-05-30",
          archivedAt: "2026-06-01T00:00:00.000Z",
          memo: "",
        }}
        archived
        onToggleDone={noop}
        onEdit={noop}
        onDelete={noop}
        onArchive={noop}
      />
    </Frame>
  );
}
