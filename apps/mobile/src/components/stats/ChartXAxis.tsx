import { useState } from "react";

import type { ChartData } from "@packages/frontend-shared/types/stats";
import { shouldShowXLabel } from "@packages/frontend-shared/utils/chartUtils";
import { Text, View } from "react-native";

const LABEL_WRAPPER_WIDTH = 40;

export function ChartXAxis({
  data,
  tickStep,
  yAxisWidth,
}: {
  data: ChartData[];
  tickStep: number;
  yAxisWidth: number;
}) {
  const [width, setWidth] = useState(0);

  return (
    <View
      style={{
        height: 24,
        marginLeft: yAxisWidth,
        borderTopWidth: 1,
        borderColor: "#e5e7eb",
      }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 &&
        data.map((d, i) => {
          if (!shouldShowXLabel(i, data.length, tickStep)) return null;
          const centerX = ((i + 0.5) / data.length) * width;
          return (
            <View
              key={d.date}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: centerX - LABEL_WRAPPER_WIDTH / 2,
                width: LABEL_WRAPPER_WIDTH,
                top: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 9, color: "#6b7280" }} numberOfLines={1}>
                {d.date}
              </Text>
            </View>
          );
        })}
    </View>
  );
}
