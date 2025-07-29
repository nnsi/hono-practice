import { useEffect, useState } from "react";

import {
  useDeleteActivityLog,
  useUpdateActivityLog,
} from "@frontend/hooks/sync/useSyncedActivityLog";
import { apiClient } from "@frontend/utils";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  type GetActivitiesResponse,
  GetActivitiesResponseSchema,
  type GetActivityLogResponse,
} from "@dtos/response";

import { useToast } from "@components/ui";

export const useActivityLogEdit = (
  open: boolean,
  onOpenChange: (open: boolean) => void,
  log: GetActivityLogResponse | null,
) => {
  const { toast } = useToast();
  const [memo, setMemo] = useState("");
  const [quantity, setQuantity] = useState<number | null>(null);
  const [activityKindId, setActivityKindId] = useState<string>("");

  // 同期対応のフック
  const updateActivityLog = useUpdateActivityLog();
  const deleteActivityLog = useDeleteActivityLog();

  // activities一覧取得
  const { data: activities } = useQuery<GetActivitiesResponse>({
    queryKey: ["activity"],
    queryFn: async () => {
      const res = await apiClient.users.activities.$get();
      const json = await res.json();
      const parsedResult = GetActivitiesResponseSchema.safeParse(json);
      if (!parsedResult.success) {
        throw parsedResult.error;
      }
      return parsedResult.data;
    },
    enabled: open,
    networkMode: "online", // オフライン時はキャッシュデータを使用
    staleTime: 1000 * 60 * 5, // 5分間はキャッシュを有効とする
  });

  // 編集対象のactivity情報
  // オフライン時はlogに含まれるactivity情報を使用
  const activity =
    activities?.find((a) => a.id === log?.activity.id) ||
    (log
      ? {
          id: log.activity.id,
          name: log.activity.name,
          quantityUnit: log.activity.quantityUnit,
          emoji: log.activity.emoji,
          iconType: log.activity.iconType ?? "emoji",
          kinds: log.activityKind ? [log.activityKind] : [],
        }
      : undefined);

  // log変更時に初期値をセット
  useEffect(() => {
    if (log) {
      setMemo(log.memo ?? "");
      setQuantity(log.quantity ?? null);
      setActivityKindId(log.activityKind?.id ?? "");
    }
  }, [log]);

  // 保存処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!log) return;

    try {
      await updateActivityLog.mutateAsync({
        id: log.id,
        memo,
        quantity: quantity ?? undefined,
        activityKindId: activityKindId || undefined,
        date: dayjs(log.date).format("YYYY-MM-DD"),
        activityKindInfo: activityKindId
          ? activity?.kinds?.find((k) => k.id === activityKindId) ||
            log.activityKind ||
            undefined
          : undefined,
      });

      toast({ title: "保存しました", variant: "default" });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "エラー",
        description: "保存に失敗しました",
        variant: "destructive",
      });
    }
  };

  // 削除処理
  const handleDelete = async () => {
    if (!log) return;

    try {
      await deleteActivityLog.mutateAsync({
        id: log.id,
        date: dayjs(log.date).format("YYYY-MM-DD"),
      });

      toast({ title: "削除しました", variant: "default" });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "エラー",
        description: "削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  // quantity入力ハンドラ
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantity(e.target.value ? Number(e.target.value) : null);
  };

  // activityKind選択ハンドラ
  const handleActivityKindChange = (value: string) => {
    setActivityKindId(value);
  };

  // memo入力ハンドラ
  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMemo(e.target.value);
  };

  return {
    // State
    memo,
    quantity,
    activityKindId,

    // Data
    activity,

    // Mutations
    updateActivityLog,
    deleteActivityLog,

    // Handlers
    handleSubmit,
    handleDelete,
    handleQuantityChange,
    handleActivityKindChange,
    handleMemoChange,
  };
};
