import { GoalCardHeader } from "actiko-frontend";

// ゴールカードの見出し行（アイコン/名前/バランス/バッジ/日次目標/期間/アクション）。
// 「貯金(+)/負債(-)」のメタファが要。バランス・色・バッジは全て props で受けるので、
// 状態を静的に作り分けられる。カード状の枠に載せて実際の見え方に寄せる。
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ width: 320 }}
      className="bg-white rounded-2xl border border-gray-200/60 shadow-soft overflow-hidden"
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
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  isActive: true,
  description: "",
  debtCap: null,
  currentBalance: 0,
  totalTarget: 0,
  totalActual: 0,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

const onTrackBadge = {
  label: "順調",
  bgClass: "bg-green-100",
  textClass: "text-green-700",
};
const inDebtBadge = {
  label: "負債あり",
  bgClass: "bg-red-100",
  textClass: "text-red-700",
};
const endedBadge = {
  label: "終了",
  bgClass: "bg-gray-200",
  textClass: "text-gray-600",
};

const noop = () => {};

export function Savings() {
  return (
    <Frame>
      <GoalCardHeader
        goal={baseGoal}
        activity={runningActivity}
        isExpanded={false}
        isPast={false}
        localBalance={45}
        debtCapped={false}
        balanceColor="text-blue-600"
        statusBadge={onTrackBadge}
        isCurrentlyFrozen={false}
        showDeleteConfirm={false}
        deleting={false}
        onToggleExpand={noop}
        onEditStart={noop}
        onRecordOpen={noop}
        onDeactivate={noop}
        onDeleteConfirm={noop}
        onDeleteCancel={noop}
        onHandleDelete={noop}
      />
    </Frame>
  );
}

export function InDebt() {
  return (
    <Frame>
      <GoalCardHeader
        goal={baseGoal}
        activity={runningActivity}
        isExpanded={false}
        isPast={false}
        localBalance={-60}
        debtCapped={false}
        balanceColor="text-red-600"
        statusBadge={inDebtBadge}
        isCurrentlyFrozen={false}
        showDeleteConfirm={false}
        deleting={false}
        onToggleExpand={noop}
        onEditStart={noop}
        onRecordOpen={noop}
        onDeactivate={noop}
        onDeleteConfirm={noop}
        onDeleteCancel={noop}
        onHandleDelete={noop}
      />
    </Frame>
  );
}

export function FrozenWithDebtCap() {
  return (
    <Frame>
      <GoalCardHeader
        goal={baseGoal}
        activity={runningActivity}
        isExpanded={false}
        isPast={false}
        localBalance={-210}
        debtCapped={true}
        balanceColor="text-red-600"
        statusBadge={inDebtBadge}
        isCurrentlyFrozen={true}
        showDeleteConfirm={false}
        deleting={false}
        onToggleExpand={noop}
        onEditStart={noop}
        onRecordOpen={noop}
        onDeactivate={noop}
        onDeleteConfirm={noop}
        onDeleteCancel={noop}
        onHandleDelete={noop}
      />
    </Frame>
  );
}

export function PastExpanded() {
  return (
    <Frame>
      <GoalCardHeader
        goal={{ ...baseGoal, isActive: false }}
        activity={runningActivity}
        isExpanded={true}
        isPast={true}
        localBalance={120}
        debtCapped={false}
        balanceColor="text-blue-600"
        statusBadge={endedBadge}
        isCurrentlyFrozen={false}
        showDeleteConfirm={false}
        deleting={false}
        onToggleExpand={noop}
        onEditStart={noop}
        onRecordOpen={noop}
        onDeactivate={noop}
        onDeleteConfirm={noop}
        onDeleteCancel={noop}
        onHandleDelete={noop}
      />
    </Frame>
  );
}
