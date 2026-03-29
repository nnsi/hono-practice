export type TooltipData = {
  x: number;
  y: number;
  lines: { name: string; value: number; color: string }[];
};

export function ChartTooltip({ tooltip }: { tooltip: TooltipData }) {
  return (
    <div
      className="absolute z-10 bg-white border rounded-lg shadow-sm px-2.5 py-1.5 pointer-events-none"
      style={{
        left: tooltip.x,
        top: tooltip.y - 10,
        transform: "translate(-50%, -100%)",
      }}
    >
      {tooltip.lines.map((l) => (
        <div key={l.name} className="flex items-center gap-1.5 text-xs">
          <span
            className="w-2 h-2 rounded-sm inline-block"
            style={{ backgroundColor: l.color }}
          />
          <span className="text-gray-700">
            {l.name}: {l.value}
          </span>
        </div>
      ))}
    </div>
  );
}
