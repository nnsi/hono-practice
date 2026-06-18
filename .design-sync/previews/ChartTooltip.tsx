import { ChartTooltip } from "actiko-frontend";

// ChartTooltip is absolutely positioned at (x, y) relative to a chart container.
// Wrap it in a sized relative box and place the tooltip in view.
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 360 }}>
      <div className="bg-white rounded-xl border border-gray-200 shadow-soft p-4">
        <div className="relative bg-gray-50 rounded-lg" style={{ height: 160 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function SingleKind() {
  return (
    <Frame>
      <ChartTooltip
        tooltip={{
          x: 150,
          y: 120,
          lines: [{ name: "ランニング", value: 45, color: "#3b82f6" }],
        }}
      />
    </Frame>
  );
}

export function MultipleKinds() {
  return (
    <Frame>
      <ChartTooltip
        tooltip={{
          x: 170,
          y: 120,
          lines: [
            { name: "朝ラン", value: 27, color: "#22c55e" },
            { name: "夜ラン", value: 18, color: "#6366f1" },
          ],
        }}
      />
    </Frame>
  );
}
