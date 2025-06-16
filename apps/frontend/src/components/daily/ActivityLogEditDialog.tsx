import { useEffect, useState } from "react";

import { apiClient } from "@frontend/utils/apiClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import type {
  GetActivityLogResponse,
  GetActivitiesResponse,
} from "@dtos/response";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  RadioGroup,
  RadioGroupItem,
  Textarea,
  useToast,
  Label,
  DialogFooter,
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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [memo, setMemo] = useState("");
  const [quantity, setQuantity] = useState<number | null>(null);
  const [activityKindId, setActivityKindId] = useState<string>("");

  // activities一覧取得
  const { data: activities } = useQuery<GetActivitiesResponse>({
    queryKey: ["activity"],
    enabled: open,
  });

  // 編集対象のactivity情報
  const activity = activities?.find((a) => a.id === log?.activity.id);

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
      await apiClient.users["activity-logs"][":id"].$put({
        param: { id: log.id },
        json: {
          memo,
          quantity: quantity ?? undefined,
          activityKindId: activityKindId || undefined,
        },
      });
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", dayjs(log.date).format("YYYY-MM-DD")],
      });
      toast({ title: "保存しました", variant: "default" });
      onOpenChange(false);
    } catch (e) {
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
      const res = await apiClient.users["activity-logs"][":id"].$delete({
        param: { id: log.id },
      });
      if (res.status !== 200) {
        toast({
          title: "エラー",
          description: "削除に失敗しました",
          variant: "destructive",
        });
        return;
      }
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", dayjs(log.date).format("YYYY-MM-DD")],
      });
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-monthly", dayjs(log.date).format("YYYY-MM")],
      });
      toast({ title: "削除しました", variant: "default" });
      onOpenChange(false);
    } catch (e) {
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
            <Button type="button" variant="destructive" onClick={handleDelete}>
              削除
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
            <Button type="submit">保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
