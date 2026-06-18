import { ActivityStatCard } from "actiko-frontend";

import type {
  ActivityStat,
  GoalLine,
  StatsKindLog,
} from "@packages/frontend-shared/types/stats";

// ActivityStatCard is the full per-activity stats card: header + kind summary
// cards + chart + summary grid + collapsible table. It derives chart data from
// each kind's logs, so the logs below drive the bars.
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 360 }}>{children}</div>;
}

const month = "2026-06-01";

// 30 calendar days for the month axis.
const allDates = Array.from(
  { length: 30 },
  (_, i) => `2026-06-${String(i + 1).padStart(2, "0")}`,
);

// Per-day running minutes; 0 marks a rest day.
const dailyMinutes = [
  20, 0, 35, 28, 0, 45, 50, 22, 18, 40, 30, 0, 25, 38, 42, 55, 33, 0, 27, 31,
  48, 60, 35, 0, 20, 44, 39, 52, 30, 41,
];

function logsFor(ratio: number): StatsKindLog[] {
  return allDates
    .map((date, i) => ({ date, quantity: Math.round(dailyMinutes[i] * ratio) }))
    .filter((l) => l.quantity > 0);
}

const morningLogs = logsFor(0.6);
const eveningLogs = logsFor(0.4);

const morningTotal = morningLogs.reduce((s, l) => s + l.quantity, 0);
const eveningTotal = eveningLogs.reduce((s, l) => s + l.quantity, 0);

const goalLines: GoalLine[] = [
  { id: "goal-daily", value: 40, label: "1日の目標 40分", color: "#ef4444" },
];

// Multi-kind, combined (stacked) stats card.
const combinedStat: ActivityStat = {
  id: "act-run",
  name: "ランニング",
  total: morningTotal + eveningTotal,
  quantityUnit: "分",
  showCombinedStats: true,
  kinds: [
    {
      id: "kind-morning",
      name: "朝ラン",
      color: "#22c55e",
      total: morningTotal,
      logs: morningLogs,
    },
    {
      id: "kind-evening",
      name: "夜ラン",
      color: "#6366f1",
      total: eveningTotal,
      logs: eveningLogs,
    },
  ],
};

export function CombinedKinds() {
  return (
    <Frame>
      <ActivityStatCard
        stat={combinedStat}
        allDates={allDates}
        month={month}
        goalLines={goalLines}
      />
    </Frame>
  );
}

// Single-kind card (read pages), no combined header total.
const singleLogs = allDates
  .map((date, i) => ({ date, quantity: dailyMinutes[i] }))
  .filter((l) => l.quantity > 0);
const singleTotal = singleLogs.reduce((s, l) => s + l.quantity, 0);

const singleStat: ActivityStat = {
  id: "act-read",
  name: "読書",
  total: null,
  quantityUnit: "ページ",
  showCombinedStats: false,
  kinds: [
    {
      id: "kind-read",
      name: "技術書",
      color: "#3b82f6",
      total: singleTotal,
      logs: singleLogs,
    },
  ],
};

export function SingleKind() {
  return (
    <Frame>
      <ActivityStatCard
        stat={singleStat}
        allDates={allDates}
        month={month}
        goalLines={[]}
      />
    </Frame>
  );
}
