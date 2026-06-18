import { GoalCard } from "actiko-frontend";

// 活動量ゴールのカード。バランス(貯金/負債)・進捗バー・経過日数を表示する。
// バランスはコンポーネント内部でローカルの activityLogs から算出される
// （プレビュー環境の Dexie は空なので実績0 → 負債側の状態が描画される）。
// 「貯金(+)」側は同梱の GoalCardHeader ストーリーで網羅している。
// 折りたたみ状態で見せる（展開時の統計/フリーズ管理は別途データ依存のため）。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 340 }} className="space-y-3">
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

const baseGoal = {
  id: "goal-1",
  userId: "user-1",
  activityId: "act-run",
  dailyTargetQuantity: 30,
  dayTargets: null,
  startDate: "2026-06-12",
  endDate: "2026-06-30",
  isActive: true,
  description: "",
  debtCap: null,
  currentBalance: 0,
  totalTarget: 0,
  totalActual: 0,
  createdAt: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
};

const noop = () => {};
const asyncNoop = async () => {};

export function Active() {
  return (
    <Frame>
      <GoalCard
        goal={baseGoal}
        activity={runningActivity}
        isExpanded={false}
        isEditing={false}
        isPast={false}
        onToggleExpand={noop}
        onEditStart={noop}
        onEditEnd={noop}
        onUpdate={asyncNoop}
        onDelete={asyncNoop}
        onRecordOpen={noop}
      />
    </Frame>
  );
}

export function WithDebtCap() {
  return (
    <Frame>
      <GoalCard
        goal={{
          ...baseGoal,
          id: "goal-2",
          activityId: "act-read",
          dailyTargetQuantity: 20,
          startDate: "2026-06-01",
          debtCap: 100,
        }}
        activity={readingActivity}
        isExpanded={false}
        isEditing={false}
        isPast={false}
        onToggleExpand={noop}
        onEditStart={noop}
        onEditEnd={noop}
        onUpdate={asyncNoop}
        onDelete={asyncNoop}
        onRecordOpen={noop}
      />
    </Frame>
  );
}

export function PastGoal() {
  return (
    <Frame>
      <GoalCard
        goal={{
          ...baseGoal,
          id: "goal-3",
          startDate: "2026-05-01",
          endDate: "2026-05-31",
          isActive: false,
        }}
        activity={runningActivity}
        isExpanded={false}
        isEditing={false}
        isPast={true}
        onToggleExpand={noop}
        onEditStart={noop}
        onEditEnd={noop}
        onUpdate={asyncNoop}
        onDelete={asyncNoop}
      />
    </Frame>
  );
}
