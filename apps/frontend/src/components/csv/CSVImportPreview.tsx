import { useMemo, useState } from "react";

import { Badge } from "@frontend/components/ui/badge";
import { Button } from "@frontend/components/ui/button";
import { Checkbox } from "@frontend/components/ui/checkbox";
import { Input } from "@frontend/components/ui/input";
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
import {
  AlertCircle,
  CheckCircle,
  Download,
  Trash2,
  XCircle,
} from "lucide-react";

import type { ValidatedActivityLog } from "@frontend/hooks/feature/csv/useActivityLogValidator";

type Props = {
  validatedLogs: ValidatedActivityLog[];
  onEdit: (
    index: number,
    field: keyof ValidatedActivityLog,
    value: string,
  ) => void;
  onRemove: (indices: number[]) => void;
  onImport: (logs: ValidatedActivityLog[]) => void;
  isImporting?: boolean;
};

export function CSVImportPreview({
  validatedLogs,
  onEdit,
  onRemove,
  onImport,
  isImporting = false,
}: Props) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const { data: activities } = useActivities();

  const stats = useMemo(() => {
    const total = validatedLogs.length;
    const errors = validatedLogs.filter((log) => log.errors.length > 0).length;
    const warnings = validatedLogs.filter(
      (log) => log.isNewActivity && log.errors.length === 0,
    ).length;
    const valid = total - errors;

    return { total, errors, warnings, valid };
  }, [validatedLogs]);

  const toggleSelection = (index: number) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedIndices(newSelection);
  };

  const toggleAll = () => {
    if (selectedIndices.size === validatedLogs.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(validatedLogs.map((_, i) => i)));
    }
  };

  const handleRemoveSelected = () => {
    onRemove(Array.from(selectedIndices));
    setSelectedIndices(new Set());
  };

  const handleExportCsv = () => {
    // CSVヘッダー
    const headers = ["date", "activity", "kind", "quantity", "memo"];
    const csvContent = [
      headers.join(","),
      ...validatedLogs.map((log) => {
        const row = [
          log.date,
          log.activityName,
          log.kindName || "",
          log.quantity.toString(),
          log.memo || "",
        ];
        // CSVのエスケープ処理
        return row
          .map((field) => {
            if (
              field.includes(",") ||
              field.includes('"') ||
              field.includes("\n")
            ) {
              return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
          })
          .join(",");
      }),
    ].join("\n");

    // ダウンロード
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity_logs_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getRowStatus = (log: ValidatedActivityLog) => {
    if (log.errors.length > 0) return "error";
    if (log.isNewActivity) return "warning";
    return "success";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  // フィルタリングされたログ
  const filteredLogs = useMemo(() => {
    if (!showErrorsOnly) return validatedLogs;
    return validatedLogs.filter((log) => log.errors.length > 0);
  }, [validatedLogs, showErrorsOnly]);

  return (
    <div className="space-y-4">
      {/* 統計情報 */}
      <div className="flex gap-4 items-center">
        <Badge variant="secondary">合計: {stats.total}件</Badge>
        <Badge variant="success">正常: {stats.valid}件</Badge>
        {stats.warnings > 0 && (
          <Badge variant="warning">
            新規アクティビティ: {stats.warnings}件
          </Badge>
        )}
        {stats.errors > 0 && (
          <Badge variant="destructive">エラー: {stats.errors}件</Badge>
        )}
        {stats.errors > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowErrorsOnly(!showErrorsOnly)}
          >
            {showErrorsOnly ? "全て表示" : "エラーのみ表示"}
          </Button>
        )}
      </div>

      {/* アクションバー */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveSelected}
            disabled={selectedIndices.size === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            選択した行を削除 ({selectedIndices.size})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={validatedLogs.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            修正済みCSVをダウンロード
          </Button>
        </div>

        <div className="flex gap-2">
          {stats.errors > 0 && (
            <div className="text-sm text-orange-600">
              ※ エラーがある行はスキップされます
            </div>
          )}
          <Button
            onClick={() => onImport(validatedLogs)}
            disabled={isImporting || stats.valid === 0}
          >
            {isImporting ? "インポート中..." : `インポート (${stats.valid}件)`}
          </Button>
        </div>
      </div>

      {/* プレビューテーブル */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedIndices.size === validatedLogs.length &&
                    validatedLogs.length > 0
                  }
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="w-12">状態</TableHead>
              <TableHead>日付</TableHead>
              <TableHead>アクティビティ</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>数量</TableHead>
              <TableHead>メモ</TableHead>
              <TableHead>エラー</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log, index) => {
              const originalIndex = validatedLogs.indexOf(log);
              const status = getRowStatus(log);
              return (
                <TableRow
                  key={`${log.date}-${log.activityName}-${log.quantity}-${index}`}
                  className={status === "error" ? "bg-red-50" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIndices.has(originalIndex)}
                      onCheckedChange={() => toggleSelection(originalIndex)}
                    />
                  </TableCell>
                  <TableCell>{getStatusIcon(status)}</TableCell>
                  <TableCell>
                    <Input
                      value={log.date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onEdit(originalIndex, "date", e.target.value)
                      }
                      className="w-32"
                      disabled={isImporting}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={log.activityName || "_new"}
                        onValueChange={(value) =>
                          onEdit(
                            originalIndex,
                            "activityName",
                            value === "_new" ? "" : value,
                          )
                        }
                        disabled={isImporting}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="選択..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_new">新規作成...</SelectItem>
                          {activities?.map((activity) => (
                            <SelectItem key={activity.id} value={activity.name}>
                              {activity.emoji} {activity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {log.activityName &&
                      !activities?.find((a) => a.name === log.activityName) ? (
                        <Input
                          value={log.activityName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            onEdit(
                              originalIndex,
                              "activityName",
                              e.target.value,
                            )
                          }
                          placeholder="新規アクティビティ名"
                          className="w-40"
                          disabled={isImporting}
                        />
                      ) : null}
                      {log.isNewActivity && log.activityName && (
                        <Badge variant="secondary" className="text-xs">
                          新規
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const selectedActivity = activities?.find(
                        (a) => a.name === log.activityName,
                      );
                      const hasKinds =
                        selectedActivity?.kinds &&
                        selectedActivity.kinds.length > 0;

                      if (!selectedActivity || !hasKinds) {
                        return (
                          <Input
                            value={log.kindName || ""}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              onEdit(originalIndex, "kindName", e.target.value)
                            }
                            className="w-32"
                            disabled={isImporting || !selectedActivity}
                            placeholder={!selectedActivity ? "-" : "種別なし"}
                          />
                        );
                      }

                      return (
                        <Select
                          value={log.kindName || "_none"}
                          onValueChange={(value) =>
                            onEdit(
                              originalIndex,
                              "kindName",
                              value === "_none" ? "" : value,
                            )
                          }
                          disabled={isImporting}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="選択..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">種別なし</SelectItem>
                            {selectedActivity.kinds.map((kind) => (
                              <SelectItem key={kind.id} value={kind.name}>
                                {kind.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={log.quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onEdit(originalIndex, "quantity", e.target.value)
                      }
                      type="number"
                      className="w-24"
                      disabled={isImporting}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={log.memo || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onEdit(originalIndex, "memo", e.target.value)
                      }
                      className="w-40"
                      disabled={isImporting}
                    />
                  </TableCell>
                  <TableCell>
                    {log.errors.length > 0 && (
                      <div className="text-sm text-red-600">
                        {log.errors.map((error, i) => (
                          <div key={`error-${i}-${error.message}`}>
                            {error.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
