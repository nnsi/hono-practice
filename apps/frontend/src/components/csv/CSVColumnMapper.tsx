import { useMemo } from "react";

import type { ColumnMapping } from "@packages/domain/csv/csvParser";
import { autoDetectMapping } from "@packages/domain/csv/csvParser";
import { useTranslation } from "@packages/i18n";
import { ArrowRight, Info } from "lucide-react";

import { useActivities } from "../../hooks/useActivities";

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
  const { t } = useTranslation("csv");
  const { activities } = useActivities();
  const sampleRows = csvSampleData.slice(0, 3);

  const FIELD_OPTIONS = [
    { value: "date", label: t("fieldDate"), required: true },
    { value: "activity", label: t("fieldActivity"), required: false },
    { value: "kind", label: t("fieldKind"), required: false },
    { value: "quantity", label: t("fieldQuantity"), required: true },
    { value: "memo", label: t("fieldMemo"), required: false },
  ] as const;

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
        <h3 className="text-base font-semibold">{t("columnMapping")}</h3>
        <button
          type="button"
          onClick={() => onMappingChange(autoDetectMapping(csvHeaders))}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {t("autoDetect")}
        </button>
      </div>

      <p className="text-sm text-gray-600">{t("mappingInstructions")}</p>

      {/* Fixed activity selector */}
      {!mapping.activity && (
        <div className="p-4 bg-blue-50 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {t("fixedActivityTitle")}
            </span>
          </div>
          <p className="text-sm text-blue-700">
            {t("fixedActivityDescription")}
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
            <option value="_none">{t("useFixed")}</option>
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
          <p className="text-sm font-medium mb-2">{t("csvColumns")}</p>
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
                    <option value="_none">{t("fieldUnselected")}</option>
                    {FIELD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                        {opt.required ? ` ${t("fieldRequired")}` : ""}
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
          <p className="text-sm font-medium mb-2">{t("mappingResult")}</p>
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
                    isRequired && !csvColumn ? "border-red-300 bg-red-50" : ""
                  }`}
                >
                  <span className="text-sm">
                    {field.label}
                    {isRequired && (
                      <span className="text-red-500">
                        {" "}
                        {t("fieldRequired")}
                      </span>
                    )}
                    {field.value === "activity" && mapping.fixedActivityId && (
                      <span className="text-gray-500 text-xs ml-1">
                        {t("fieldUsingFixed")}
                      </span>
                    )}
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400 mx-2" />
                  <span className="font-mono text-sm">
                    {csvColumn || (
                      <span className="text-gray-400">{t("fieldNotSet")}</span>
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
          <p className="text-sm font-medium mb-2">{t("sampleData")}</p>
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
          {t("next")}
        </button>
      </div>
    </div>
  );
}
