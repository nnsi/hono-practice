import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ChartData, StatsKind } from "./types";
import { formatQuantityWithUnit } from "./formatUtils";

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
  const [isExpanded, setIsExpanded] = useState(false);

  // Group data by week
  const weeks = useMemo(() => {
    type DayEntry = {
      date: string;
      dayOfWeek: string;
      total: number;
      breakdown: Record<string, number>;
    };
    type WeekEntry = {
      weekStart: dayjs.Dayjs;
      days: DayEntry[];
      weekTotal: number;
    };

    const weekMap: Record<string, WeekEntry> = {};

    for (const day of data) {
      const dayNumber = Number.parseInt(
        (day.date as string).replace("日", ""),
        10,
      );
      const dateObj = dayjs(month).date(dayNumber);
      const weekKey = dateObj.startOf("week").format("YYYY-MM-DD");

      if (!weekMap[weekKey]) {
        weekMap[weekKey] = {
          weekStart: dateObj.startOf("week"),
          days: [],
          weekTotal: 0,
        };
      }

      const dayTotal = kinds.reduce((sum, kind) => {
        return sum + (Number(day[kind.name]) || 0);
      }, 0);
      const roundedTotal = Math.round(dayTotal * 1000) / 1000;

      const breakdown: Record<string, number> = {};
      for (const kind of kinds) {
        breakdown[kind.name] = Number(day[kind.name]) || 0;
      }

      weekMap[weekKey].days.push({
        date: dateObj.format("MM/DD"),
        dayOfWeek: dateObj.format("ddd"),
        total: roundedTotal,
        breakdown,
      });

      weekMap[weekKey].weekTotal += roundedTotal;
    }

    return Object.values(weekMap).sort(
      (a, b) => a.weekStart.valueOf() - b.weekStart.valueOf(),
    );
  }, [data, kinds, month]);

  return (
    <div className="border-t">
      <button
        type="button"
        className="flex items-center justify-between w-full px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="font-semibold text-sm">日別・週別 合計値</span>
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
                  日付
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  日合計
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
                  週合計
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
                          Math.round(week.weekTotal * 1000) / 1000,
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
