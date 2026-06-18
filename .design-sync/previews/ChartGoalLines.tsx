import { ChartGoalLines } from "actiko-frontend";

import type { GoalLine } from "@packages/frontend-shared/types/stats";

// ChartGoalLines renders absolutely-positioned dashed lines inside the plot area.
// Give it a sized relative box with a faint grid so the lines read clearly.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 360 }}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-soft p-4">
        <div className="relative bg-gray-50 rounded-lg" style={{ height: 220 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const singleGoal: GoalLine[] = [
  { id: "goal-daily", value: 40, label: "1日の目標 40分", color: "#ef4444" },
];

const multipleGoals: GoalLine[] = [
  { id: "goal-min", value: 20, label: "最低ライン 20分", color: "#f59e0b" },
  { id: "goal-target", value: 45, label: "目標 45分", color: "#ef4444" },
  { id: "goal-stretch", value: 60, label: "理想 60分", color: "#22c55e" },
];

export function SingleGoal() {
  return (
    <Frame>
      <ChartGoalLines goalLines={singleGoal} effectiveYMax={65} />
    </Frame>
  );
}

export function MultipleGoals() {
  return (
    <Frame>
      <ChartGoalLines goalLines={multipleGoals} effectiveYMax={70} />
    </Frame>
  );
}
