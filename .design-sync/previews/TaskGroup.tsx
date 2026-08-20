import { TaskGroup } from "actiko-frontend";

// TaskGroup renders a titled section of TaskCards; mobile-width column.
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 340 }}>{children}</div>;
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

export function InProgress() {
  return (
    <Frame>
      <TaskGroup
        title="進行中"
        titleColor="text-green-600"
        tasks={[
          makeTask("t1", "週次レビューを書く", {
            memo: "今週の活動をまとめる",
          }),
          makeTask("t2", "プレゼン資料を作成する"),
        ]}
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
      <TaskGroup
        title="期限切れ"
        titleColor="text-red-600"
        highlight
        tasks={[
          makeTask("t3", "請求書を送付する", {
            startDate: "2026-06-08",
            dueDate: "2026-06-14",
          }),
        ]}
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
      <TaskGroup
        title="完了"
        titleColor="text-gray-500"
        completed
        tasks={[
          makeTask("t4", "朝のランニング 30分", {
            doneDate: "2026-06-18",
            dueDate: "2026-06-18",
          }),
          makeTask("t5", "買い物リストを作る", {
            doneDate: "2026-06-17",
          }),
        ]}
        onToggleDone={noop}
        onEdit={noop}
        onDelete={noop}
        onArchive={noop}
      />
    </Frame>
  );
}
