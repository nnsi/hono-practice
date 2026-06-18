import { ActivityChart } from "actiko-frontend";

import type {
  ChartData,
  GoalLine,
} from "@packages/frontend-shared/types/stats";

// ActivityChart measures its container width (useContainerWidth) before drawing
// bars, so each story needs a real, sized box.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 360 }}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-soft p-4">
        {children}
      </div>
    </div>
  );
}

// 30 days of running minutes — weekdays higher, a couple of rest days at 0.
const runningMinutes = [
  20, 0, 35, 28, 0, 45, 50, 22, 18, 40, 30, 0, 25, 38, 42, 55, 33, 0, 27, 31,
  48, 60, 35, 0, 20, 44, 39, 52, 30, 41,
];

const singleSeries: ChartData[] = runningMinutes.map((value, i) => ({
  date: `${i + 1}日`,
  values: { ランニング: value },
}));

// Stacked: morning vs evening runs that sum into a daily total.
const stackedSeries: ChartData[] = runningMinutes.map((value, i) => ({
  date: `${i + 1}日`,
  values: {
    朝ラン: Math.round(value * 0.6),
    夜ラン: value - Math.round(value * 0.6),
  },
}));

const goalLines: GoalLine[] = [
  { id: "goal-daily", value: 40, label: "1日の目標 40分", color: "#ef4444" },
];

export function SingleSeries() {
  return (
    <Frame>
      <ActivityChart
        data={singleSeries}
        dataKeys={[{ name: "ランニング", color: "#3b82f6" }]}
        showLegend={false}
      />
    </Frame>
  );
}

export function WithGoalLine() {
  return (
    <Frame>
      <ActivityChart
        data={singleSeries}
        dataKeys={[{ name: "ランニング", color: "#3b82f6" }]}
        showLegend={false}
        goalLines={goalLines}
      />
    </Frame>
  );
}

export function StackedKinds() {
  return (
    <Frame>
      <ActivityChart
        data={stackedSeries}
        dataKeys={[
          { name: "朝ラン", color: "#22c55e" },
          { name: "夜ラン", color: "#6366f1" },
        ]}
        stackId="a"
        goalLines={goalLines}
      />
    </Frame>
  );
}
