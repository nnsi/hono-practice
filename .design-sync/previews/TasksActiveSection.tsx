import { TasksActiveSection } from "actiko-frontend";

// TasksActiveSection composes the grouped task lists (overdue / due today / …)
// plus the future + completed collapsibles and the add-new button. Render inside
// a phone-width page column.
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
  startDate: "2026-06-15",
  dueDate: "2026-06-20",
  doneDate: null,
  memo: "",
  archivedAt: null,
  createdAt: "2026-06-15T00:00:00.000Z",
  updatedAt: "2026-06-15T00:00:00.000Z",
  ...extra,
});

const emptyGroups = {
  overdue: [],
  dueToday: [],
  startingToday: [],
  inProgress: [],
  dueThisWeek: [],
  notStarted: [],
  future: [],
  completed: [],
};

const handlers = {
  onToggleDone: noop,
  onEdit: noop,
  onDelete: noop,
  onArchive: noop,
  onMoveToToday: noop,
};

export function WithGroups() {
  const grouped = {
    ...emptyGroups,
    overdue: [
      makeTask("o1", "請求書を送付する", {
        startDate: "2026-06-08",
        dueDate: "2026-06-14",
      }),
    ],
    dueToday: [
      makeTask("d1", "朝のランニング 30分", { dueDate: "2026-06-18" }),
    ],
    inProgress: [
      makeTask("i1", "週次レビューを書く", { memo: "今週の振り返り" }),
      makeTask("i2", "プレゼン資料を作成する"),
    ],
  };
  return (
    <Frame>
      <TasksActiveSection
        groupedTasks={grouped}
        futureCount={2}
        completedCount={3}
        hasAnyTasks
        showFuture={false}
        showCompleted={false}
        onToggleFuture={noop}
        onToggleCompleted={noop}
        onOpenCreate={noop}
        {...handlers}
      />
    </Frame>
  );
}

export function Empty() {
  return (
    <Frame>
      <TasksActiveSection
        groupedTasks={emptyGroups}
        futureCount={0}
        completedCount={0}
        hasAnyTasks={false}
        showFuture={false}
        showCompleted={false}
        onToggleFuture={noop}
        onToggleCompleted={noop}
        onOpenCreate={noop}
        {...handlers}
      />
    </Frame>
  );
}
