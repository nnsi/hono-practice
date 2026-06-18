import { LogCard } from "actiko-frontend";

// LogCard is a full-width button row; wrap in a mobile-width list column.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 320 }} className="space-y-2">
      {children}
    </div>
  );
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

const readingActivity = {
  ...runningActivity,
  id: "act-read",
  name: "読書",
  emoji: "📚",
  quantityUnit: "ページ",
};

const morningKind = {
  id: "kind-morning",
  activityId: "act-run",
  name: "朝ラン",
  color: "#22c55e",
  orderIndex: "a0",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  deletedAt: null,
  _syncStatus: "synced" as const,
};

export function WithKindAndMemo() {
  return (
    <Frame>
      <LogCard
        log={{
          id: "log-1",
          activityId: "act-run",
          activityKindId: "kind-morning",
          quantity: 30,
          memo: "朝のジョギング 公園3周",
          date: "2026-06-18",
          time: "07:10",
          _syncStatus: "synced",
        }}
        activity={runningActivity}
        kind={morningKind}
        onClick={() => {}}
      />
    </Frame>
  );
}

export function Plain() {
  return (
    <Frame>
      <LogCard
        log={{
          id: "log-2",
          activityId: "act-read",
          activityKindId: null,
          quantity: 42,
          memo: "",
          date: "2026-06-18",
          time: null,
          _syncStatus: "synced",
        }}
        activity={readingActivity}
        kind={null}
        onClick={() => {}}
      />
    </Frame>
  );
}

export function Pending() {
  return (
    <Frame>
      <LogCard
        log={{
          id: "log-3",
          activityId: "act-run",
          activityKindId: null,
          quantity: 45,
          memo: "夕方のラン",
          date: "2026-06-18",
          time: "18:30",
          _syncStatus: "pending",
        }}
        activity={runningActivity}
        kind={null}
        onClick={() => {}}
      />
    </Frame>
  );
}
