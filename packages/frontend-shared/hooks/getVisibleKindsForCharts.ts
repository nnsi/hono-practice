import type { ActivityStat } from "../types/stats";

export function getVisibleKindsForCharts(
  stat: Pick<ActivityStat, "showCombinedStats" | "kinds">,
): ActivityStat["kinds"] {
  if (stat.showCombinedStats) return stat.kinds;
  return stat.kinds.filter((k) => k.total > 0);
}
