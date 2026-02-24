import { formatQuantityWithUnit } from "./formatUtils";

export function SummarySection({
  summary,
  quantityUnit,
}: {
  summary: {
    totalQuantity: number;
    activeDays: number;
    daysInMonth: number;
    avgPerDay: number;
  };
  quantityUnit: string;
}) {
  return (
    <div className="px-4 pb-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-lg p-3 border text-center min-w-0">
          <div className="text-xs text-gray-500 mb-0.5">合計</div>
          <div className="text-xs font-bold leading-tight break-all">
            {formatQuantityWithUnit(summary.totalQuantity, quantityUnit)}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border text-center min-w-0">
          <div className="text-xs text-gray-500 mb-0.5">日平均</div>
          <div className="text-xs font-bold leading-tight break-all">
            {formatQuantityWithUnit(summary.avgPerDay, quantityUnit)}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border text-center min-w-0">
          <div className="text-xs text-gray-500 mb-0.5">記録日数</div>
          <div className="text-sm font-bold">
            {summary.activeDays}
            <span className="text-xs font-normal text-gray-400">
              /{summary.daysInMonth}日
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
