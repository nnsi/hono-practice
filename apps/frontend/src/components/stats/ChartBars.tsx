import type { ChartData } from "@packages/frontend-shared/types/stats";
import {
  barHeightPct,
  stackedTotal,
} from "@packages/frontend-shared/utils/chartUtils";

export function ChartBars({
  data,
  dataKeys,
  effectiveYMax,
  stackId,
  onBarHover,
  onBarLeave,
}: {
  data: ChartData[];
  dataKeys: { name: string; color: string }[];
  effectiveYMax: number;
  stackId?: string;
  onBarHover: (e: React.MouseEvent, d: ChartData) => void;
  onBarLeave: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-end">
      {data.map((d) => {
        const dateLabel = d.date;

        if (stackId) {
          const total = stackedTotal(d, dataKeys);
          const totalPct = barHeightPct(total, effectiveYMax);

          return (
            <div
              key={dateLabel}
              className="flex-1 flex flex-col items-center justify-end h-full"
              onMouseMove={(e) => onBarHover(e, d)}
              onMouseLeave={onBarLeave}
            >
              <div
                className="w-[60%] max-w-6 flex flex-col-reverse rounded-t-sm overflow-hidden"
                style={{ height: `${totalPct}%` }}
              >
                {dataKeys.map((key) => {
                  const value = d.values[key.name] || 0;
                  if (value === 0 || total === 0) return null;
                  return (
                    <div
                      key={key.name}
                      style={{
                        backgroundColor: key.color,
                        height: `${(value / total) * 100}%`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <div
            key={dateLabel}
            className="flex-1 flex items-end justify-center gap-px h-full"
            onMouseMove={(e) => onBarHover(e, d)}
            onMouseLeave={onBarLeave}
          >
            {dataKeys.map((key) => {
              const value = d.values[key.name] || 0;
              const barPct = barHeightPct(value, effectiveYMax);
              return (
                <div
                  key={key.name}
                  className="rounded-t-sm"
                  style={{
                    backgroundColor: key.color,
                    height: `${barPct}%`,
                    width: `${Math.floor(60 / dataKeys.length)}%`,
                    maxWidth: 24,
                    minWidth: 2,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
