import type { HeatmapCell } from "@packages/domain/goal/goalHeatmap";
import type { HeatmapSlot } from "@packages/frontend-shared/hooks/useGoalHeatmap";
import { useTranslation } from "@packages/i18n";
import { Loader2 } from "lucide-react";

import { useGoalHeatmap } from "./useGoalHeatmap";

function slotColor(slot: HeatmapSlot): string {
  if (!slot.cell || slot.cell.totalGoals === 0) return "bg-gray-100";
  const { achievedCount, activeCount, totalGoals } = slot.cell;
  if (achievedCount === totalGoals) return "bg-green-500";
  if (achievedCount > 0) {
    const ratio = achievedCount / totalGoals;
    if (ratio >= 0.66) return "bg-green-400";
    return "bg-green-300";
  }
  if (activeCount > 0) return "bg-yellow-300";
  return "bg-gray-200";
}

function slotTooltip(
  cell: HeatmapCell | null,
  date: string,
  achieved: string,
): string {
  if (!cell || cell.totalGoals === 0) return date;
  return `${date}: ${cell.achievedCount}/${cell.totalGoals}${achieved}`;
}

export function GoalHeatmap() {
  const { t } = useTranslation("goal");
  const { grid, isLoading } = useGoalHeatmap();
  const achievedLabel = t("heatmapAchieved");

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-3 flex items-center justify-center mb-4">
        <Loader2 size={14} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 mb-4">
      <div className="w-fit mx-auto">
        {/* GitHubスタイル: 行=曜日(7), 列=週(N) */}
        <div className="flex gap-[3px] sm:gap-1">
          {/* 曜日ラベル列 */}
          <div className="flex flex-col gap-[3px] sm:gap-1 mr-0.5">
            {grid.dayLabels.map((label, i) => (
              <div
                key={label}
                className="h-[13px] sm:h-4 md:h-[18px] flex items-center justify-end"
              >
                {i % 2 === 0 ? (
                  <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 leading-none">
                    {label}
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          {/* データ列 */}
          {grid.columns.map((col) => (
            <div key={col.key} className="flex flex-col gap-[3px] sm:gap-1">
              {col.slots.map((slot) => (
                <div
                  key={slot.key}
                  title={slotTooltip(slot.cell, slot.key, achievedLabel)}
                  className={`w-[13px] h-[13px] sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] rounded-[2px] ${slotColor(slot)} ${
                    slot.isToday ? "ring-1 ring-gray-900" : ""
                  }`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* 日付範囲ラベル + 凡例 */}
        <div className="flex items-center justify-between mt-1.5 sm:mt-2">
          <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-400">
            {grid.startLabel} — {grid.endLabel}
          </span>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <span className="inline-block w-[9px] h-[9px] sm:w-3 sm:h-3 rounded-[2px] bg-gray-200" />
            <span className="inline-block w-[9px] h-[9px] sm:w-3 sm:h-3 rounded-[2px] bg-yellow-300" />
            <span className="inline-block w-[9px] h-[9px] sm:w-3 sm:h-3 rounded-[2px] bg-green-300" />
            <span className="inline-block w-[9px] h-[9px] sm:w-3 sm:h-3 rounded-[2px] bg-green-500" />
            <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 ml-0.5">
              {t("heatmapAchieved")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
