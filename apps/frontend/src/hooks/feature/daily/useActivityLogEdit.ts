import { useToast } from "@components/ui";
import type { GetActivityLogResponse } from "@dtos/response";
import { useActivities } from "@frontend/hooks/api";
import {
  useDeleteActivityLog,
  useUpdateActivityLog,
} from "@frontend/hooks/api/useActivityLogs";
import { createWebNotificationAdapter } from "@packages/frontend-shared/adapters";
import { createUseActivityLogEdit } from "@packages/frontend-shared/hooks/feature";

export const useActivityLogEdit = (
  open: boolean,
  onOpenChange: (open: boolean) => void,
  log: GetActivityLogResponse | null,
) => {
  const { toast } = useToast();

  // 同期対応のフック（楽観的更新+onSettledでinvalidate済み）
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
    updateActivityLog,
    deleteActivityLog,
    notification,
  };

  const { formProps, actions } = createUseActivityLogEdit(
    dependencies,
    open,
    onOpenChange,
    log,
  );

  // 後方互換性を維持
  return {
    ...formProps,
    // 旧API互換のアクション
    handleMemoChange: actions.onMemoChange,
    handleQuantityChange: actions.onQuantityChange,
    handleActivityKindChange: actions.onActivityKindChange,
    handleSubmit: actions.onSubmit,
    handleDelete: actions.onDelete,
    // 新しいグループ化されたAPIも公開
    formProps,
    actions,
  };
};
