import { buildDedupKey, buildDedupSet } from "@packages/domain/csv/csvDedup";

import { activityLogRepository } from "../../repositories/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";

type ParsedRow = { date: string; time: string; quantity: string; memo: string };

type ImportProgress = {
  processed: number;
  total: number;
  succeeded: number;
  failed: number;
};

export async function runCSVImport(
  selectedActivityId: string | null,
  parsedRows: ParsedRow[],
  validationResults: string[][],
  setIsImporting: (v: boolean) => void,
  setError: (v: string | null) => void,
  setProgress: (v: ImportProgress) => void,
  setSuccessCount: (v: number) => void,
): Promise<void> {
  if (!selectedActivityId) {
    setError("アクティビティを選択してください");
    return;
  }
  if (parsedRows.length === 0) {
    setError("インポートするデータがありません");
    return;
  }

  const validRows = parsedRows.filter(
    (_, i) => validationResults[i].length === 0,
  );
  if (validRows.length === 0) {
    setError("有効なデータがありません");
    return;
  }

  setIsImporting(true);
  setError(null);
  setProgress({
    processed: 0,
    total: validRows.length,
    succeeded: 0,
    failed: 0,
  });

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const dates = validRows.map((r) =>
      r.date.includes("T") ? r.date.split("T")[0] : r.date,
    );
    const minDate = dates.reduce((a, b) => (a < b ? a : b));
    const maxDate = dates.reduce((a, b) => (a > b ? a : b));
    const existingLogs = await activityLogRepository.getActivityLogsBetween(
      minDate,
      maxDate,
    );
    const dedupSet = buildDedupSet(existingLogs);

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const quantity = row.quantity ? Number(row.quantity) : null;
        const date = row.date.includes("T") ? row.date.split("T")[0] : row.date;
        const memo = row.memo;
        const dedupKey = buildDedupKey({
          date,
          activityId: selectedActivityId,
          quantity,
          memo,
        });
        if (dedupSet.has(dedupKey)) {
          skipped++;
          continue;
        }
        await activityLogRepository.createActivityLog({
          activityId: selectedActivityId,
          activityKindId: null,
          quantity,
          memo,
          date,
          time: row.time || null,
          taskId: null,
        });
        dedupSet.add(dedupKey);
        succeeded++;
      } catch {
        failed++;
      }
      setProgress({
        processed: i + 1,
        total: validRows.length,
        succeeded,
        failed,
      });
    }

    syncEngine.syncAll();

    const messages: string[] = [];
    if (skipped > 0) messages.push(`${skipped}件は重複のためスキップ`);
    if (failed > 0) messages.push(`${failed}件のインポートに失敗`);

    setSuccessCount(succeeded);
    if (messages.length > 0) {
      setError(messages.join("、"));
    }
  } catch {
    setError("インポートに失敗しました");
  } finally {
    setIsImporting(false);
  }
}
