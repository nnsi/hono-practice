import { useCallback, useState } from "react";
import { buildCSVContent } from "@packages/domain/csv/csvExport";
import { db } from "../db/schema";

type ExportResult = { count: number };

export function useCSVExport() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!startDate || !endDate) {
      setError("開始日と終了日を指定してください");
      return;
    }
    if (startDate > endDate) {
      setError("開始日は終了日より前にしてください");
      return;
    }

    setIsExporting(true);
    setError(null);
    setResult(null);

    try {
      const logs = await db.activityLogs
        .where("date")
        .between(startDate, endDate, true, true)
        .filter((log) => log.deletedAt === null)
        .sortBy("date");

      if (logs.length === 0) {
        setError("指定期間に活動記録がありません");
        setIsExporting(false);
        return;
      }

      const activities = await db.activities
        .filter((a) => !a.deletedAt)
        .toArray();
      const kinds = await db.activityKinds
        .filter((k) => !k.deletedAt)
        .toArray();

      const activityMap = new Map(activities.map((a) => [a.id, a]));
      const kindMap = new Map(kinds.map((k) => [k.id, k]));

      const csvContent = buildCSVContent(logs, activityMap, kindMap);

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `activity_logs_${startDate}_${endDate}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      setResult({ count: logs.length });
    } catch {
      setError("エクスポート中にエラーが発生しました");
    } finally {
      setIsExporting(false);
    }
  }, [startDate, endDate]);

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    isExporting,
    result,
    error,
    handleExport,
  };
}
