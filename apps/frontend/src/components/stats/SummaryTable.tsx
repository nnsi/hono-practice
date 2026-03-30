import { useMemo, useState } from "react";

import type {
  ChartData,
  StatsKind,
} from "@packages/frontend-shared/types/stats";
import { buildWeeks } from "@packages/frontend-shared/utils/buildWeeks";
import {
  formatQuantityWithUnit,
  roundQuantity,
} from "@packages/frontend-shared/utils/statsFormatting";
import { useTranslation } from "@packages/i18n";
import { ChevronDown, ChevronUp } from "lucide-react";

export function SummaryTable({
  quantityUnit,
  data,
  kinds,
  kindColors,
  month,
}: {
  quantityUnit: string;
  data: ChartData[];
  kinds: StatsKind[];
  kindColors: Record<string, string>;
  month: string;
}) {
  const { t } = useTranslation("stats");
  const [isExpanded, setIsExpanded] = useState(false);

  // Group data by week
  const weeks = useMemo(
    () => buildWeeks(data, kinds, month, t("dateLabel")),
    [data, kinds, month, t],
  );

  return (
    <div className="border-t">
      <button
        type="button"
        className="flex items-center justify-between w-full px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="font-semibold text-sm">{t("tableExpandButton")}</span>
        {isExpanded ? (
          <ChevronUp size={18} className="text-gray-400" />
        ) : (
          <ChevronDown size={18} className="text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {t("tableDateHeader")}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("tableDailyTotalHeader")}
                </th>
                {kinds.length > 1 &&
                  kinds.map((kind) => (
                    <th
                      key={kind.name}
                      className="hidden md:table-cell px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase"
                    >
                      {kind.name}
                    </th>
                  ))}
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  {t("tableWeeklyTotalHeader")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {weeks.map((week) =>
                week.days.map((day, dayIndex) => (
                  <tr
                    key={`${day.date}-${day.dayOfWeek}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-3 py-1.5 whitespace-nowrap text-gray-900">
                      {day.date} ({day.dayOfWeek})
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-right font-medium">
                      {day.total > 0
                        ? formatQuantityWithUnit(day.total, quantityUnit)
                        : "-"}
                    </td>
                    {kinds.length > 1 &&
                      kinds.map((kind) => (
                        <td
                          key={kind.name}
                          className="hidden md:table-cell px-3 py-1.5 whitespace-nowrap text-right"
                          style={{ color: kindColors[kind.name] }}
                        >
                          {day.breakdown[kind.name] || "-"}
                        </td>
                      ))}
                    {dayIndex === 0 && (
                      <td
                        className="px-3 py-1.5 whitespace-nowrap text-right font-bold bg-gray-50"
                        rowSpan={week.days.length}
                      >
                        {formatQuantityWithUnit(
                          roundQuantity(week.weekTotal),
                          quantityUnit,
                        )}
                      </td>
                    )}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
