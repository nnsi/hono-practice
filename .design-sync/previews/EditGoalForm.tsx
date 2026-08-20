import { EditGoalForm } from "actiko-frontend";

// 目標編集フォーム。モーダルではなくインライン展開されるカード（青枠）。
// GoalCard を編集モードにしたときに差し替わる本体で、日次目標・期間・曜日別目標・
// 負債上限の入力欄と、無効化/削除/保存ボタンを内部 state 初期値付きで描画する。
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
  createdAt: "2024-05-01T00:00:00.000Z",
  updatedAt: "2024-05-01T00:00:00.000Z",
  deletedAt: null,
  _syncStatus: "synced" as const,
};

const baseGoal = {
  id: "goal-1",
  userId: "user-1",
  activityId: "act-run",
  dailyTargetQuantity: 30,
  dayTargets: null,
  startDate: "2024-05-01",
  endDate: "2024-05-31",
  isActive: true,
  description: "",
  debtCap: null,
  currentBalance: 0,
  totalTarget: 0,
  totalActual: 0,
  createdAt: "2024-05-01T00:00:00.000Z",
  updatedAt: "2024-05-01T00:00:00.000Z",
};

const asyncNoop = async () => {};
const noop = () => {};

export function Default() {
  return (
    <Frame>
      <EditGoalForm
        goal={baseGoal}
        activity={runningActivity}
        onCancel={noop}
        onSave={asyncNoop}
        onDelete={noop}
      />
    </Frame>
  );
}

export function WithDayTargetsAndDebtCap() {
  return (
    <Frame>
      <EditGoalForm
        goal={{
          ...baseGoal,
          id: "goal-2",
          activityId: "act-read",
          dailyTargetQuantity: 20,
          dayTargets: {
            "1": 20,
            "2": 20,
            "3": 20,
            "4": 20,
            "5": 20,
            "6": 40,
            "7": 0,
          },
          debtCap: 140,
        }}
        activity={{
          ...runningActivity,
          id: "act-read",
          name: "読書",
          emoji: "📚",
          quantityUnit: "ページ",
        }}
        onCancel={noop}
        onSave={asyncNoop}
        onDelete={noop}
      />
    </Frame>
  );
}
