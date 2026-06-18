import { TasksArchivedSection } from "actiko-frontend";

// TasksArchivedSection renders the archived-tasks list (or an empty state).
// Render inside a phone-width page column.
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 360 }}>{children}</div>;
}

const noop = () => {};

const makeTask = (id: string, title: string, extra = {}) => ({
  id,
  userId: "user-1",
  activityId: null,
  activityKindId: null,
  quantity: null,
  title,
  startDate: "2026-05-01",
  dueDate: "2026-05-31",
  doneDate: "2026-05-30",
  memo: "",
  archivedAt: "2026-06-01T00:00:00.000Z",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  ...extra,
});

const handlers = {
  onToggleDone: noop,
  onEdit: noop,
  onDelete: noop,
  onArchive: noop,
  onMoveToToday: noop,
};

export function WithArchived() {
  return (
    <Frame>
      <TasksArchivedSection
        archivedTasks={[
          makeTask("a1", "確定申告の書類を整理する"),
          makeTask("a2", "古いメモを削除する", { dueDate: "2026-04-30" }),
        ]}
        {...handlers}
      />
    </Frame>
  );
}

export function Empty() {
  return (
    <Frame>
      <TasksArchivedSection archivedTasks={[]} {...handlers} />
    </Frame>
  );
}
