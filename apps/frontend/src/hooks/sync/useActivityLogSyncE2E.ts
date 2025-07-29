import type { GetActivityLogResponse } from "@dtos/response";

/**
 * E2Eテスト用の簡略化されたuseActivityLogSync
 * 無限ループを避けるため、localStorage監視機能を削除
 */
export function useActivityLogSync({
  activityLogs,
}: {
  date: Date;
  isOnline: boolean;
  activityLogs?: GetActivityLogResponse[];
}) {
  const mergedActivityLogs = activityLogs || [];

  return {
    mergedActivityLogs,
    isOfflineData: false,
  };
}
