import { useEffect, useState } from "react";

import {
  useDeleteActivityLog,
  useUpdateActivityLog,
} from "@frontend/hooks/useSyncedActivityLog";
import { apiClient } from "@frontend/utils";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  type GetActivitiesResponse,
  GetActivitiesResponseSchema,
  type GetActivityLogResponse,
} from "@dtos/response";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Textarea,
  useToast,
} from "@components/ui";

export type ActivityLogEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: GetActivityLogResponse | null;
};

export const ActivityLogEditDialog: React.FC<ActivityLogEditDialogProps> = ({
  open,
  onOpenChange,
  log,
}) => {
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

  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {log.activity.name}
            {log.activityKind && `[${log.activityKind.name}]`}
          </DialogTitle>
          <DialogDescription>
            活動記録の詳細を編集・削除できます
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center">
            <div className="flex flex-1 w-full items-center gap-1">
              <Input
                value={quantity ?? ""}
                onChange={(e) =>
                  setQuantity(e.target.value ? Number(e.target.value) : null)
                }
                className="w-24"
                inputMode="numeric"
                autoComplete="off"
              />
              <span>{activity?.quantityUnit ?? log.activity.quantityUnit}</span>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteActivityLog.isPending}
            >
              {deleteActivityLog.isPending ? "削除中..." : "削除"}
            </Button>
          </div>
          {activity?.kinds && activity.kinds.length > 0 && (
            <RadioGroup
              className="flex"
              value={activityKindId}
              onValueChange={(v) => setActivityKindId(v)}
            >
              <div className="flex items-center space-y-0 gap-1">
                <RadioGroupItem value="" />
                <Label>未指定</Label>
              </div>
              {activity.kinds.map((kind) => (
                <div
                  key={kind.id}
                  className="flex items-center space-y-0 gap-1"
                >
                  <RadioGroupItem value={kind.id} />
                  <Label>{kind.name}</Label>
                </div>
              ))}
            </RadioGroup>
          )}
          <Textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="h-24"
            placeholder="メモ"
            autoComplete="off"
          />
          <DialogFooter className="flex-shrink-0">
            <Button type="submit" disabled={updateActivityLog.isPending}>
              {updateActivityLog.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
