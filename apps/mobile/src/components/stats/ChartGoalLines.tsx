import type { GoalLine } from "@packages/frontend-shared/types/stats";
import { tickBottomPct } from "@packages/frontend-shared/utils/chartUtils";
import { Text, View } from "react-native";

import { DashedLine } from "./DashedLine";

export function ChartGoalLines({
  goalLines,
  effectiveYMax,
}: {
  goalLines: GoalLine[];
  effectiveYMax: number;
}) {
  return (
    <>
      {goalLines.map((goal) => {
        const pct = Math.min(tickBottomPct(goal.value, effectiveYMax), 100);
        return (
          <View
            key={goal.id}
            style={{
              position: "absolute",
              bottom: `${pct}%`,
              left: 0,
              right: 0,
              zIndex: 1,
            }}
          >
            <DashedLine color={goal.color} />
            <Text
              style={{
                position: "absolute",
                right: 0,
                bottom: 4,
                fontSize: 9,
                color: goal.color,
                textShadowColor: "#fff",
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 3,
              }}
            >
              {goal.label}
            </Text>
          </View>
        );
      })}
    </>
  );
}
