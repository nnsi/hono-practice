import { useMemo } from "react";

import { Button } from "@frontend/components/ui/button";
import { Label } from "@frontend/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@frontend/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@frontend/components/ui/table";
import { useActivities } from "@frontend/hooks/api/useActivities";
import { ArrowRight, Info } from "lucide-react";

export type ColumnMapping = {
  date?: string;
  activity?: string;
  kind?: string;
  quantity?: string;
  memo?: string;
  fixedActivityId?: string; // 固定アクティビティID
};

type Props = {
  csvHeaders: string[];
  csvSampleData: Record<string, string>[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onConfirm: () => void;
};

const FIELD_OPTIONS = [
  { value: "date", label: "日付", required: true },
  { value: "activity", label: "アクティビティ", required: false }, // 固定アクティビティ使用時は不要
  { value: "kind", label: "種別", required: false },
  { value: "quantity", label: "数量", required: true },
  { value: "memo", label: "メモ", required: false },
];

export function CSVColumnMapper({
  csvHeaders,
  csvSampleData,
  mapping,
  onMappingChange,
  onConfirm,
}: Props) {
  const { data: activities } = useActivities();
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

    // 既存のマッピングから該当するフィールドを削除
    Object.keys(newMapping).forEach((key) => {
      if (newMapping[key as keyof ColumnMapping] === csvColumn) {
        delete newMapping[key as keyof ColumnMapping];
      }
    });

    // 新しいマッピングを設定
    if (field && field !== "_none") {
      newMapping[field as keyof ColumnMapping] = csvColumn;
    }

    onMappingChange(newMapping);
  };

  const getMappedField = (csvColumn: string): string | undefined => {
    return Object.entries(mapping).find(([_, col]) => col === csvColumn)?.[0];
  };

  const autoDetectMapping = () => {
    const newMapping: ColumnMapping = {};

    csvHeaders.forEach((header) => {
      const lowerHeader = header.toLowerCase();

      if (lowerHeader.includes("date") || lowerHeader.includes("日付")) {
        newMapping.date = header;
      } else if (
        lowerHeader.includes("activity") ||
        lowerHeader.includes("活動") ||
        lowerHeader.includes("アクティビティ")
      ) {
        newMapping.activity = header;
      } else if (
        lowerHeader.includes("kind") ||
        lowerHeader.includes("種別") ||
        lowerHeader.includes("タイプ")
      ) {
        newMapping.kind = header;
      } else if (
        lowerHeader.includes("quantity") ||
        lowerHeader.includes("数量") ||
        lowerHeader.includes("時間") ||
        lowerHeader.includes("回数") ||
        lowerHeader === "count" ||
        lowerHeader === "cnt"
      ) {
        newMapping.quantity = header;
      } else if (
        lowerHeader.includes("memo") ||
        lowerHeader.includes("メモ") ||
        lowerHeader.includes("備考")
      ) {
        newMapping.memo = header;
      }
    });

    onMappingChange(newMapping);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">カラムマッピング</h3>
        <Button variant="outline" size="sm" onClick={autoDetectMapping}>
          自動検出
        </Button>
      </div>

      <p className="text-sm text-gray-600">
        CSVのカラムをアクティビティログのフィールドにマッピングしてください
      </p>

      {/* 固定アクティビティ選択 */}
      {!mapping.activity && (
        <div className="p-4 bg-blue-50 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <Label className="text-sm font-medium text-blue-800">
              固定アクティビティを使用
            </Label>
          </div>
          <p className="text-sm text-blue-700">
            CSVにアクティビティ列がない場合、すべての行に同じアクティビティを適用できます
          </p>
          <Select
            value={mapping.fixedActivityId || "_none"}
            onValueChange={(value) => {
              const newMapping = { ...mapping };
              if (value === "_none") {
                newMapping.fixedActivityId = undefined;
              } else {
                newMapping.fixedActivityId = value;
              }
              onMappingChange(newMapping);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="アクティビティを選択..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">使用しない</SelectItem>
              {activities?.map((activity) => (
                <SelectItem key={activity.id} value={activity.id}>
                  {activity.emoji} {activity.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">
        {/* CSVカラム一覧 */}
        <div>
          <Label className="text-sm font-medium mb-2">CSVカラム</Label>
          <div className="space-y-2">
            {csvHeaders.map((header) => {
              const mappedField = getMappedField(header);
              return (
                <div
                  key={header}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="font-mono text-sm">{header}</span>
                  <Select
                    value={mappedField || "_none"}
                    onValueChange={(value) =>
                      handleFieldChange(
                        header,
                        value === "_none" ? null : value,
                      )
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">未選択</SelectItem>
                      {FIELD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                          {option.required && " *"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </div>

        {/* マッピング結果 */}
        <div>
          <Label className="text-sm font-medium mb-2">マッピング結果</Label>
          <div className="space-y-2">
            {FIELD_OPTIONS.map((field) => {
              const csvColumn = mapping[field.value as keyof ColumnMapping];
              // アクティビティフィールドは固定アクティビティがない場合のみ必須
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
                    {isRequired && <span className="text-red-500"> *</span>}
                    {field.value === "activity" && mapping.fixedActivityId && (
                      <span className="text-gray-500 text-xs ml-1">
                        （固定使用中）
                      </span>
                    )}
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <span className="font-mono text-sm">
                    {csvColumn || <span className="text-gray-400">未設定</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* サンプルデータプレビュー */}
      {sampleRows.length > 0 && (
        <div>
          <Label className="text-sm font-medium mb-2">
            サンプルデータ（最初の3行）
          </Label>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {csvHeaders.map((header) => {
                    const field = getMappedField(header);
                    return (
                      <TableHead key={header}>
                        <div>
                          <div className="font-mono text-xs">{header}</div>
                          {field && (
                            <div className="text-xs text-primary mt-1">
                              →{" "}
                              {
                                FIELD_OPTIONS.find((opt) => opt.value === field)
                                  ?.label
                              }
                            </div>
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleRows.map((row, index) => (
                  <TableRow
                    key={`row-${index}-${Object.values(row).join("-")}`}
                  >
                    {csvHeaders.map((header) => (
                      <TableCell key={header} className="font-mono text-sm">
                        {row[header] || "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={onConfirm} disabled={!isValid}>
          次へ
        </Button>
      </div>
    </div>
  );
}
