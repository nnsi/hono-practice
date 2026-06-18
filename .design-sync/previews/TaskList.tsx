import { TaskList } from "actiko-frontend";

// TaskList renders a vertical list of daily tasks; mobile-width column.
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 320 }}>{children}</div>;
}

const runningActivity = {
  id: "act-run",
  userId: "user-1",
  name: "ランニング",
  label: "ランニング",
  emoji: "🏃",
  iconType: "emoji" as const,
  iconUrl: null,
  iconThumbnailUrl: null,
  description: "",
  quantityUnit: "分",
  orderIndex: "a0",
  showCombinedStats: true,
  recordingMode: "manual" as const,
  recordingModeConfig: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  deletedAt: null,
  _syncStatus: "synced" as const,
};

const activitiesMap = new Map([["act-run", runningActivity]]);

const tasks = [
  {
    id: "task-1",
    activityId: "act-run",
    activityKindId: null,
    quantity: 30,
    title: "朝のランニング 30分",
    doneDate: "2026-06-18",
    memo: "公園コース",
    startDate: "2026-06-18",
    dueDate: "2026-06-18",
    _syncStatus: "synced" as const,
  },
  {
    id: "task-2",
    activityId: null,
    activityKindId: null,
    quantity: null,
    title: "週次レビューを書く",
    doneDate: null,
    memo: "今週やったことを振り返る",
    startDate: "2026-06-18",
    dueDate: "2026-06-20",
    _syncStatus: "synced" as const,
  },
  {
    id: "task-3",
    activityId: null,
    activityKindId: null,
    quantity: null,
    title: "歯医者の予約を取る",
    doneDate: null,
    memo: "",
    startDate: null,
    dueDate: null,
    _syncStatus: "synced" as const,
  },
];

export function WithTasks() {
  return (
    <Frame>
      <TaskList
        tasks={tasks}
        isLoading={false}
        onToggle={async () => {}}
        activitiesMap={activitiesMap}
      />
    </Frame>
  );
}

export function Loading() {
  return (
    <Frame>
      <TaskList tasks={[]} isLoading={true} onToggle={async () => {}} />
    </Frame>
  );
}

export function Empty() {
  return (
    <Frame>
      <TaskList tasks={[]} isLoading={false} onToggle={async () => {}} />
    </Frame>
  );
}
