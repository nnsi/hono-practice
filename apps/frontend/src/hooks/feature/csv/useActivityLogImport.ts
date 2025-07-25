import { useCallback, useState } from "react";

import { useActivities } from "@frontend/hooks/api/useActivities";
import { apiClient } from "@frontend/utils/apiClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  CreateActivityLogBatchRequest,
  CreateActivityLogBatchResponse,
} from "@dtos/index";

import type { ValidatedActivityLog } from "./useActivityLogValidator";

export type ImportProgress = {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  isImporting: boolean;
};

export type ImportResult = {
  success: boolean;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
  errors: Array<{
    index: number;
    message: string;
  }>;
};

export function useActivityLogImport() {
  const queryClient = useQueryClient();
  const { data: activities } = useActivities();
  const [progress, setProgress] = useState<ImportProgress>({
    total: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    isImporting: false,
  });

  const createNewActivities = useCallback(
    async (logs: ValidatedActivityLog[]) => {
      const newActivityNames = [
        ...new Set(
          logs
            .filter((log) => log.isNewActivity && log.activityName)
            .map((log) => log.activityName),
        ),
      ];

      const createdActivities = new Map<string, string>();

      for (const name of newActivityNames) {
        try {
          const response = await apiClient.users.activities.$post({
            json: {
              name,
              quantityUnit: "回",
              emoji: "📊",
              description: "",
              showCombinedStats: false,
            },
          });

          if (response.ok) {
            const data = await response.json();
            createdActivities.set(name, data.id);
          }
        } catch (error) {
          console.error(`Failed to create activity: ${name}`, error);
        }
      }

      return createdActivities;
    },
    [],
  );

  const findActivityId = useCallback(
    (activityName: string, createdActivities: Map<string, string>) => {
      // 新規作成されたアクティビティから探す
      const createdId = createdActivities.get(activityName);
      if (createdId) return createdId;

      // 既存のアクティビティから探す
      const existingActivity = activities?.find(
        (a: any) => a.name === activityName,
      );
      return existingActivity?.id;
    },
    [activities],
  );

  const findKindId = useCallback(
    (activityName: string, kindName?: string) => {
      if (!kindName || !activities) return undefined;

      const activity = activities.find((a: any) => a.name === activityName);
      if (!activity?.kinds) return undefined;

      const kind = activity.kinds.find((k: any) => k.name === kindName);
      return kind?.id;
    },
    [activities],
  );

  const batchImportMutation = useMutation<
    CreateActivityLogBatchResponse,
    Error,
    CreateActivityLogBatchRequest
  >({
    mutationFn: async (request) => {
      const response = await apiClient.users["activity-logs"].batch.$post({
        json: request,
      });

      if (!response.ok) {
        throw new Error("バッチインポートに失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activityLogs"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });

  const importLogs = useCallback(
    async (validatedLogs: ValidatedActivityLog[]): Promise<ImportResult> => {
      // エラーがあるログを除外
      const logsToImport = validatedLogs.filter(
        (log) => log.errors.length === 0,
      );
      const logsWithErrors = validatedLogs.filter(
        (log) => log.errors.length > 0,
      );

      if (logsToImport.length === 0) {
        return {
          success: false,
          summary: {
            total: validatedLogs.length,
            succeeded: 0,
            failed: validatedLogs.length,
          },
          errors: validatedLogs.map((log, index) => ({
            index,
            message: log.errors.map((e) => e.message).join(", "),
          })),
        };
      }

      setProgress({
        total: logsToImport.length,
        processed: 0,
        succeeded: 0,
        failed: 0,
        isImporting: true,
      });

      try {
        // 新規アクティビティを作成
        const createdActivities = await createNewActivities(logsToImport);

        // アクティビティIDを解決してリクエストを作成
        const activityLogs = logsToImport.map((log) => {
          const activityId = findActivityId(
            log.activityName,
            createdActivities,
          );
          const activityKindId = findKindId(log.activityName, log.kindName);

          return {
            date: log.date,
            quantity: log.quantity,
            memo: log.memo,
            activityId: activityId || "",
            activityKindId,
          };
        });

        // バッチインポート実行
        const result = await batchImportMutation.mutateAsync({
          activityLogs,
        });

        const totalProcessed = result.summary.total + logsWithErrors.length;
        const totalFailed = result.summary.failed + logsWithErrors.length;

        setProgress({
          total: totalProcessed,
          processed: totalProcessed,
          succeeded: result.summary.succeeded,
          failed: totalFailed,
          isImporting: false,
        });

        // バックエンドエラーとバリデーションエラーを統合
        const allErrors = [
          ...result.results
            .filter((r: any) => !r.success)
            .map((r: any, idx: number) => ({
              index: validatedLogs.findIndex(
                (log) => log === logsToImport[idx],
              ),
              message: r.error || "不明なエラー",
            })),
          ...logsWithErrors.map((log) => ({
            index: validatedLogs.indexOf(log),
            message: log.errors.map((e) => e.message).join(", "),
          })),
        ];

        return {
          success: totalFailed === 0,
          summary: {
            total: totalProcessed,
            succeeded: result.summary.succeeded,
            failed: totalFailed,
          },
          errors: allErrors,
        };
      } catch (error) {
        setProgress((prev) => ({ ...prev, isImporting: false }));
        throw error;
      }
    },
    [createNewActivities, findActivityId, findKindId, batchImportMutation],
  );

  const resetProgress = useCallback(() => {
    setProgress({
      total: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      isImporting: false,
    });
  }, []);

  return {
    importLogs,
    progress,
    resetProgress,
    isImporting: progress.isImporting,
  };
}
