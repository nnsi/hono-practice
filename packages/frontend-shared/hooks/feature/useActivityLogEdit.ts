import { useCallback, useEffect, useState } from "react";

import type {
  GetActivityLogResponse,
  GetActivityResponse,
} from "@dtos/response";
import type { NotificationAdapter } from "@packages/frontend-shared/adapters";
import dayjs from "dayjs";

export type ActivityLogEditDependencies = {
  activities: GetActivityResponse[] | undefined;
  updateActivityLog: {
    mutateAsync: (params: {
      id: string;
      data: {
        memo?: string;
        quantity?: number;
        activityKindId?: string;
      };
      date: string;
    }) => Promise<unknown>;
    isPending?: boolean;
  };
  deleteActivityLog: {
    mutateAsync: (params: { id: string; date: string }) => Promise<unknown>;
    isPending?: boolean;
  };
  notification: NotificationAdapter;
};

// Grouped return types for better organization
export type ActivityLogEditFormProps = {
  memo: string;
  quantity: number | null;
  activityKindId: string;
  activity: GetActivityResponse | undefined;
  isUpdatePending: boolean;
  isDeletePending: boolean;
};

export type ActivityLogEditActions = {
  onSubmit: (e?: React.FormEvent) => Promise<void>;
  onDelete: () => Promise<void>;
  onQuantityChange: (value: string) => void;
  onActivityKindChange: (value: string) => void;
  onMemoChange: (value: string) => void;
};

export type UseActivityLogEditReturn = {
  formProps: ActivityLogEditFormProps;
  actions: ActivityLogEditActions;
};

export function createUseActivityLogEdit(
  dependencies: ActivityLogEditDependencies,
  _open: boolean,
  onOpenChange: (open: boolean) => void,
  log: GetActivityLogResponse | null,
): UseActivityLogEditReturn {
  const { activities, updateActivityLog, deleteActivityLog, notification } =
    dependencies;

  const [memo, setMemo] = useState("");
  const [quantity, setQuantity] = useState<number | null>(null);
  const [activityKindId, setActivityKindId] = useState<string>("");

  // 編集対象のactivity情報
  // オフライン時はlogに含まれるactivity情報を使用
  const activity =
    activities?.find((a) => a.id === log?.activity.id) ||
    ((log
      ? {
          id: log.activity.id,
          name: log.activity.name,
          quantityUnit: log.activity.quantityUnit,
          emoji: log.activity.emoji,
          iconType: (log.activity as any).iconType ?? "emoji",
          kinds: log.activityKind ? [log.activityKind] : [],
          ...(log.activity as any),
        }
      : undefined) as GetActivityResponse | undefined);

  // log変更時に初期値をセット
  useEffect(() => {
    if (log) {
      setMemo(log.memo ?? "");
      setQuantity(log.quantity ?? null);
      setActivityKindId(log.activityKind?.id ?? "");
    }
  }, [log]);

  // 保存処理
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!log) return;

      try {
        await updateActivityLog.mutateAsync({
          id: log.id,
          data: {
            memo,
            quantity: quantity ?? undefined,
            activityKindId: activityKindId || undefined,
          },
          date: dayjs(log.date).format("YYYY-MM-DD"),
        });

        notification.toast({ title: "保存しました", variant: "default" });
        onOpenChange(false);
      } catch (_error) {
        notification.toast({
          title: "エラー",
          description: "保存に失敗しました",
          variant: "destructive",
        });
      }
    },
    [
      log,
      memo,
      quantity,
      activityKindId,
      updateActivityLog,
      notification,
      onOpenChange,
    ],
  );

  // 削除処理
  const handleDelete = useCallback(async () => {
    if (!log) return;

    try {
      await deleteActivityLog.mutateAsync({
        id: log.id,
        date: dayjs(log.date).format("YYYY-MM-DD"),
      });

      notification.toast({ title: "削除しました", variant: "default" });
      onOpenChange(false);
    } catch (_error) {
      notification.toast({
        title: "エラー",
        description: "削除に失敗しました",
        variant: "destructive",
      });
    }
  }, [log, deleteActivityLog, notification, onOpenChange]);

  // quantity入力ハンドラ
  const handleQuantityChange = useCallback((value: string) => {
    setQuantity(value ? Number(value) : null);
  }, []);

  // activityKind選択ハンドラ
  const handleActivityKindChange = useCallback((value: string) => {
    setActivityKindId(value);
  }, []);

  // memo入力ハンドラ
  const handleMemoChange = useCallback((value: string) => {
    setMemo(value);
  }, []);

  return {
    formProps: {
      memo,
      quantity,
      activityKindId,
      activity,
      isUpdatePending: updateActivityLog.isPending ?? false,
      isDeletePending: deleteActivityLog.isPending ?? false,
    } as ActivityLogEditFormProps,
    actions: {
      onSubmit: handleSubmit,
      onDelete: handleDelete,
      onQuantityChange: handleQuantityChange,
      onActivityKindChange: handleActivityKindChange,
      onMemoChange: handleMemoChange,
    } as ActivityLogEditActions,
  };
}
