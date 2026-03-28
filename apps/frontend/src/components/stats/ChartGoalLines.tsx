import type { GoalLine } from "@packages/frontend-shared/types/stats";
import { tickBottomPct } from "@packages/frontend-shared/utils/chartUtils";

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
          <div
            key={goal.id}
            className="absolute left-0 right-0 z-[1]"
            style={{ bottom: `${pct}%` }}
          >
            <div
              style={{
                borderTopColor: goal.color,
                borderTopStyle: "dashed",
                borderTopWidth: 1.5,
              }}
            />
            <span
              className="text-[10px] absolute right-0 whitespace-nowrap"
              style={{
                color: goal.color,
                bottom: 4,
                textShadow:
                  "-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 -1px 0 #fff, 0 1px 0 #fff, -1px 0 0 #fff, 1px 0 0 #fff",
              }}
            >
              {goal.label}
            </span>
          </div>
        );
      })}
    </>
  );
}
