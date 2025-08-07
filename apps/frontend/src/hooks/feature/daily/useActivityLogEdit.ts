import { useActivities } from "@frontend/hooks/api";
import {
  useDeleteActivityLog,
  useUpdateActivityLog,
} from "@frontend/hooks/api/useActivityLogs";
import { createWebNotificationAdapter } from "@packages/frontend-shared/adapters";
import { createUseActivityLogEdit } from "@packages/frontend-shared/hooks/feature";

import type { GetActivityLogResponse } from "@dtos/response";

import { useToast } from "@components/ui";

export const useActivityLogEdit = (
  _open: boolean,
  onOpenChange: (open: boolean) => void,
  log: GetActivityLogResponse | null,
) => {
  const { toast } = useToast();

  // 同期対応のフック
  const updateActivityLog = useUpdateActivityLog();
  const deleteActivityLog = useDeleteActivityLog();

  // activities一覧取得
  const { data: activities } = useActivities();

  const notification = createWebNotificationAdapter();
  if ("setToastCallback" in notification) {
    notification.setToastCallback(toast);
  }

  const dependencies = {
    activities,
    updateActivityLog: {
      mutateAsync: async (params: any) => {
        await updateActivityLog.mutateAsync(params);
      },
    },
    deleteActivityLog: {
      mutateAsync: async (params: any) => {
        await deleteActivityLog.mutateAsync(params);
      },
    },
    notification,
  };

  return createUseActivityLogEdit(dependencies, _open, onOpenChange, log);
};
