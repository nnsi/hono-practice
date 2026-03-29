import type { ChartData } from "@packages/frontend-shared/types/stats";
import {
  barHeightPct,
  stackedTotal,
} from "@packages/frontend-shared/utils/chartUtils";
import { View } from "react-native";

export function ChartBars({
  data,
  dataKeys,
  effectiveYMax,
  stackId,
}: {
  data: ChartData[];
  dataKeys: { name: string; color: string }[];
  effectiveYMax: number;
  stackId?: string;
}) {
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "flex-end",
      }}
    >
      {data.map((d) => {
        const dateLabel = d.date;

        if (stackId) {
          const total = stackedTotal(d, dataKeys);
          const totalPct = barHeightPct(total, effectiveYMax);

          return (
            <View
              key={dateLabel}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "flex-end",
                height: "100%",
              }}
            >
              <View
                style={{
                  width: "60%",
                  maxWidth: 20,
                  height: `${totalPct}%`,
                  borderTopLeftRadius: 2,
                  borderTopRightRadius: 2,
                  overflow: "hidden",
                  flexDirection: "column-reverse",
                }}
              >
                {dataKeys.map((key) => {
                  const value = d.values[key.name] || 0;
                  if (value === 0 || total === 0) return null;
                  return (
                    <View
                      key={key.name}
                      style={{
                        backgroundColor: key.color,
                        height: `${(value / total) * 100}%`,
                      }}
                    />
                  );
                })}
              </View>
            </View>
          );
        }

        return (
          <View
            key={dateLabel}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 1,
              height: "100%",
            }}
          >
            {dataKeys.map((key) => {
              const value = d.values[key.name] || 0;
              const barPct = barHeightPct(value, effectiveYMax);
              return (
                <View
                  key={key.name}
                  style={{
                    backgroundColor: key.color,
                    height: `${barPct}%`,
                    width: `${Math.floor(60 / dataKeys.length)}%`,
                    maxWidth: 20,
                    minWidth: 2,
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                  }}
                />
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
