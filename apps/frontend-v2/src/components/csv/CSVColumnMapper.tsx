import { useMemo } from "react";
import { autoDetectMapping } from "@packages/domain/csv/csvParser";
import type { ColumnMapping } from "@packages/domain/csv/csvParser";
import { useActivities } from "../../hooks/useActivities";
import { ArrowRight, Info } from "lucide-react";

const FIELD_OPTIONS = [
  { value: "date", label: "日付", required: true },
  { value: "activity", label: "アクティビティ", required: false },
  { value: "kind", label: "種別", required: false },
  { value: "quantity", label: "数量", required: true },
  { value: "memo", label: "メモ", required: false },
] as const;

type Props = {
  csvHeaders: string[];
  csvSampleData: Record<string, string>[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onConfirm: () => void;
};

export function CSVColumnMapper({
  csvHeaders,
  csvSampleData,
  mapping,
  onMappingChange,
  onConfirm,
}: Props) {
  const { activities } = useActivities();
  const sampleRows = csvSampleData.slice(0, 3);

  const isValid = useMemo(() => {
    return !!(
      mapping.date &&
      (mapping.activity || mapping.fixedActivityId) &&
      mapping.quantity
    );
  }, [mapping]);

  const handleFieldChange = (csvColumn: string, field: string | null) => {
    const newMapping = { ...mapping };
    for (const key of Object.keys(newMapping)) {
      if (newMapping[key as keyof ColumnMapping] === csvColumn) {
        delete newMapping[key as keyof ColumnMapping];
      }
    }
    if (field && field !== "_none") {
      newMapping[field as keyof ColumnMapping] = csvColumn;
    }
    onMappingChange(newMapping);
  };

  const getMappedField = (csvColumn: string): string | undefined => {
    return Object.entries(mapping).find(([, col]) => col === csvColumn)?.[0];
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold">カラムマッピング</h3>
        <button
          type="button"
          onClick={() => onMappingChange(autoDetectMapping(csvHeaders))}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          自動検出
        </button>
      </div>

      <p className="text-sm text-gray-600">
        CSVのカラムをアクティビティログのフィールドにマッピングしてください
      </p>

      {/* Fixed activity selector */}
      {!mapping.activity && (
        <div className="p-4 bg-blue-50 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              固定アクティビティを使用
            </span>
          </div>
          <p className="text-sm text-blue-700">
            CSVにアクティビティ列がない場合、すべての行に同じアクティビティを適用できます
          </p>
          <select
            value={mapping.fixedActivityId || "_none"}
            onChange={(e) => {
              const value = e.target.value;
              const newMapping = { ...mapping };
              newMapping.fixedActivityId =
                value === "_none" ? undefined : value;
              onMappingChange(newMapping);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="_none">使用しない</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji} {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Mapping grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* CSV columns */}
        <div>
          <p className="text-sm font-medium mb-2">CSVカラム</p>
          <div className="space-y-2">
            {csvHeaders.map((header) => {
              const mappedField = getMappedField(header);
              return (
                <div
                  key={header}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="font-mono text-sm">{header}</span>
                  <select
                    value={mappedField || "_none"}
                    onChange={(e) =>
                      handleFieldChange(
                        header,
                        e.target.value === "_none" ? null : e.target.value,
                      )
                    }
                    className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="_none">未選択</option>
                    {FIELD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                        {opt.required ? " *" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mapping result */}
        <div>
          <p className="text-sm font-medium mb-2">マッピング結果</p>
          <div className="space-y-2">
            {FIELD_OPTIONS.map((field) => {
              const csvColumn = mapping[field.value as keyof ColumnMapping];
              const isRequired =
                field.value === "activity"
                  ? field.required && !mapping.fixedActivityId
                  : field.required;
              return (
                <div
                  key={field.value}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    isRequired && !csvColumn
                      ? "border-red-300 bg-red-50"
                      : ""
                  }`}
                >
                  <span className="text-sm">
                    {field.label}
                    {isRequired && <span className="text-red-500"> *</span>}
                    {field.value === "activity" && mapping.fixedActivityId && (
                      <span className="text-gray-500 text-xs ml-1">
                        （固定使用中）
                      </span>
                    )}
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400 mx-2" />
                  <span className="font-mono text-sm">
                    {csvColumn || (
                      <span className="text-gray-400">未設定</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sample data preview */}
      {sampleRows.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">
            サンプルデータ（最初の3行）
          </p>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {csvHeaders.map((header) => {
                    const field = getMappedField(header);
                    return (
                      <th
                        key={header}
                        className="px-3 py-2 text-left font-medium"
                      >
                        <div className="font-mono text-xs">{header}</div>
                        {field && (
                          <div className="text-xs text-blue-600 mt-0.5">
                            →{" "}
                            {
                              FIELD_OPTIONS.find((o) => o.value === field)
                                ?.label
                            }
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((row, i) => (
                  <tr
                    key={`sample-${i}-${Object.values(row).join("-")}`}
                    className="border-b last:border-0"
                  >
                    {csvHeaders.map((header) => (
                      <td key={header} className="px-3 py-2 font-mono text-xs">
                        {row[header] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!isValid}
          className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
            isValid
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          次へ
        </button>
      </div>
    </div>
  );
}
