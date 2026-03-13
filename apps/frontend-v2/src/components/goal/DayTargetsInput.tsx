export { buildDayTargets } from "@packages/domain/goal/dayTargets";

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"] as const;
const DAY_KEYS = ["1", "2", "3", "4", "5", "6", "7"] as const;

export function DayTargetsInput({
  enabled,
  onToggle,
  values,
  onChange,
  defaultTarget,
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  defaultTarget: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            onToggle(e.target.checked);
            if (e.target.checked && Object.keys(values).length === 0) {
              const init: Record<string, string> = {};
              for (const k of DAY_KEYS) init[k] = defaultTarget;
              onChange(init);
            }
          }}
          className="rounded"
        />
        曜日別に設定
      </label>
      {enabled && (
        <div className="grid grid-cols-7 gap-1 mt-2">
          {DAY_KEYS.map((k, i) => {
            const val = values[k] ?? defaultTarget;
            const isRest = val === "0";
            return (
              <div key={k} className="flex flex-col items-center gap-0.5">
                <span
                  className={`text-[10px] font-medium ${
                    i === 6
                      ? "text-red-500"
                      : i === 5
                        ? "text-blue-500"
                        : "text-gray-500"
                  }`}
                >
                  {DAY_LABELS[i]}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={val}
                  onChange={(e) => onChange({ ...values, [k]: e.target.value })}
                  className={`w-full px-1 py-1 border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isRest
                      ? "border-gray-200 bg-gray-50 text-gray-400"
                      : "border-gray-300"
                  }`}
                  min="0"
                  step="any"
                />
                {isRest && (
                  <span className="text-[9px] text-gray-400">休み</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
