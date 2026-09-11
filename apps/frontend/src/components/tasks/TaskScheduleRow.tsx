import type { TaskScheduleRecord } from "@packages/domain/taskSchedule";
import { formatScheduleDateRange } from "@packages/frontend-shared/hooks/taskScheduleSummary";
import { useTranslation } from "@packages/i18n";
import {
  CalendarDays,
  Pause,
  Pencil,
  Play,
  Repeat,
  Trash2,
} from "lucide-react";

import { useActivities } from "../../hooks/useActivities";
import { renderActivityIcon } from "../goal/activityHelpers";
import { useRecurrenceSummary } from "./useRecurrenceSummary";

type Props = {
  schedule: TaskScheduleRecord;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
};

const iconButtonClass =
  "p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0";

export function TaskScheduleRow({
  schedule,
  onEdit,
  onToggleActive,
  onDelete,
}: Props) {
  const { t } = useTranslation("task");
  const summarize = useRecurrenceSummary();
  const { activities } = useActivities();
  const linkedActivity = schedule.activityId
    ? activities.find((a) => a.id === schedule.activityId)
    : undefined;
  const range = formatScheduleDateRange(schedule);
  const paused = !schedule.isActive;

  return (
    <div
      className={`flex items-center gap-3 p-3.5 rounded-2xl bg-white shadow-soft border border-gray-200/50 transition-all ${
        paused ? "opacity-60" : "hover:shadow-lifted"
      }`}
    >
      <Repeat
        size={18}
        className={`flex-shrink-0 ${paused ? "text-gray-400" : "text-blue-500"}`}
        aria-hidden
      />

      <button
        type="button"
        onClick={onEdit}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium text-gray-900 truncate">
            {schedule.title}
          </span>
          {paused && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
              {t("schedules.paused")}
            </span>
          )}
        </div>
        <div className="text-xs text-blue-600 mt-0.5">
          {summarize(schedule)}
        </div>
        {linkedActivity && (
          <span className="text-xs text-gray-500 inline-flex items-center gap-1 mt-0.5">
            {renderActivityIcon(linkedActivity, "w-3.5 h-3.5")}{" "}
            {linkedActivity.name}
            {schedule.quantity != null &&
              ` · ${schedule.quantity}${
                linkedActivity.quantityUnit
                  ? ` ${linkedActivity.quantityUnit}`
                  : ""
              }`}
          </span>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          <CalendarDays size={12} className="text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-500">
            {range.start} - {range.end ?? t("schedules.noEndDate")}
          </span>
        </div>
      </button>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onToggleActive}
          className={iconButtonClass}
          aria-label={paused ? t("schedules.resume") : t("schedules.pause")}
          aria-pressed={paused}
        >
          {paused ? (
            <Play size={16} className="text-green-600" />
          ) : (
            <Pause size={16} className="text-gray-400" />
          )}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className={iconButtonClass}
          aria-label={t("card.edit")}
        >
          <Pencil size={16} className="text-gray-400" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className={iconButtonClass}
          aria-label={t("card.delete")}
        >
          <Trash2 size={16} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
}
