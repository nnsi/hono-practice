import { GoalStatsDetail } from "actiko-frontend";

// ゴールカード展開時の統計詳細（活動日数・達成日数・最大連続・平均・最大、
// および直近14日の日次バー）。実績はローカル Dexie の activityLogs から
// useLiveQuery で読むため、プレビュー環境（空DB）では 0/空の状態が描画される。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ width: 340 }}
      className="bg-white rounded-xl border border-gray-200 shadow-soft overflow-hidden"
    >
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

const baseGoal = {
  id: "goal-1",
  userId: "user-1",
  activityId: "act-run",
  dailyTargetQuantity: 30,
  dayTargets: null,
  startDate: "2026-06-05",
  endDate: "2026-06-30",
  isActive: true,
  description: "",
  debtCap: null,
  currentBalance: 0,
  totalTarget: 0,
  totalActual: 0,
  createdAt: "2026-06-05T00:00:00.000Z",
  updatedAt: "2026-06-05T00:00:00.000Z",
};

export function Default() {
  return (
    <Frame>
      <GoalStatsDetail goal={baseGoal} activity={runningActivity} />
    </Frame>
  );
}

export function LongerPeriod() {
  return (
    <Frame>
      <GoalStatsDetail
        goal={{
          ...baseGoal,
          id: "goal-2",
          dailyTargetQuantity: 45,
          startDate: "2026-05-20",
        }}
        activity={runningActivity}
      />
    </Frame>
  );
}
