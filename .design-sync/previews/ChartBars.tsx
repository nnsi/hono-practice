import { ChartBars } from "actiko-frontend";

import type { ChartData } from "@packages/frontend-shared/types/stats";

// ChartBars is positioned `absolute inset-0` inside the chart's plot area, so it
// needs a sized relative box to fill.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 360 }}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-soft p-4">
        <div className="relative" style={{ height: 220 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const runningMinutes = [
  20, 0, 35, 28, 0, 45, 50, 22, 18, 40, 30, 0, 25, 38, 42, 55, 33, 0, 27, 31,
  48, 60, 35, 0, 20, 44, 39, 52, 30, 41,
];

const singleSeries: ChartData[] = runningMinutes.map((value, i) => ({
  date: `${i + 1}日`,
  values: { ランニング: value },
}));

const stackedSeries: ChartData[] = runningMinutes.map((value, i) => ({
  date: `${i + 1}日`,
  values: {
    朝ラン: Math.round(value * 0.6),
    夜ラン: value - Math.round(value * 0.6),
  },
}));

export function Bars() {
  return (
    <Frame>
      <ChartBars
        data={singleSeries}
        dataKeys={[{ name: "ランニング", color: "#3b82f6" }]}
        effectiveYMax={65}
        onBarHover={() => {}}
        onBarLeave={() => {}}
      />
    </Frame>
  );
}

export function StackedBars() {
  return (
    <Frame>
      <ChartBars
        data={stackedSeries}
        dataKeys={[
          { name: "朝ラン", color: "#22c55e" },
          { name: "夜ラン", color: "#6366f1" },
        ]}
        effectiveYMax={65}
        stackId="a"
        onBarHover={() => {}}
        onBarLeave={() => {}}
      />
    </Frame>
  );
}
