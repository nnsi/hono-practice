import { SummaryTable } from "actiko-frontend";

import type {
  ChartData,
  StatsKind,
} from "@packages/frontend-shared/types/stats";

// SummaryTable is a collapsible "expand" row that opens a per-day/weekly table.
// It starts collapsed, so the default render is the expand button. The data
// below is realistic so the expanded table reads correctly when opened.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 360 }}>
      <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

const month = "2026-06-01";

// 30 days of running minutes split into 朝ラン / 夜ラン kinds.
const runningMinutes = [
  20, 0, 35, 28, 0, 45, 50, 22, 18, 40, 30, 0, 25, 38, 42, 55, 33, 0, 27, 31,
  48, 60, 35, 0, 20, 44, 39, 52, 30, 41,
];

const data: ChartData[] = runningMinutes.map((value, i) => ({
  date: `${i + 1}日`,
  values: {
    朝ラン: Math.round(value * 0.6),
    夜ラン: value - Math.round(value * 0.6),
  },
}));

const kinds: StatsKind[] = [
  {
    id: "kind-morning",
    name: "朝ラン",
    color: "#22c55e",
    total: 567,
    logs: [],
  },
  {
    id: "kind-evening",
    name: "夜ラン",
    color: "#6366f1",
    total: 378,
    logs: [],
  },
];

const kindColors: Record<string, string> = {
  朝ラン: "#22c55e",
  夜ラン: "#6366f1",
};

export function Collapsed() {
  return (
    <Frame>
      <SummaryTable
        quantityUnit="分"
        data={data}
        kinds={kinds}
        kindColors={kindColors}
        month={month}
      />
    </Frame>
  );
}

// Single-kind variant: the per-kind columns are hidden (kinds.length === 1).
export function SingleKind() {
  return (
    <Frame>
      <SummaryTable
        quantityUnit="ページ"
        data={runningMinutes.map((value, i) => ({
          date: `${i + 1}日`,
          values: { 読書: value },
        }))}
        kinds={[{ id: null, name: "読書", color: null, total: 945, logs: [] }]}
        kindColors={{ 読書: "#3b82f6" }}
        month={month}
      />
    </Frame>
  );
}
