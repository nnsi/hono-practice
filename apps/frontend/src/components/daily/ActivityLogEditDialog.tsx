import { useActivityLogEdit } from "@frontend/hooks/feature/daily/useActivityLogEdit";

import type { GetActivityLogResponse } from "@dtos/response";

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
  const {
    memo,
    quantity,
    activityKindId,
    activity,
    updateActivityLog,
    deleteActivityLog,
    handleSubmit,
    handleDelete,
    handleQuantityChange,
    handleActivityKindChange,
    handleMemoChange,
  } = useActivityLogEdit(open, onOpenChange, log);

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
                onChange={handleQuantityChange}
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
              disabled={(deleteActivityLog as any).isPending || false}
            >
              {(deleteActivityLog as any).isPending ? "削除中..." : "削除"}
            </Button>
          </div>
          {activity?.kinds && activity.kinds.length > 0 && (
            <RadioGroup
              className="flex"
              value={activityKindId}
              onValueChange={handleActivityKindChange}
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
            onChange={handleMemoChange}
            className="h-24"
            placeholder="メモ"
            autoComplete="off"
          />
          <DialogFooter className="flex-shrink-0">
            <Button
              type="submit"
              disabled={(updateActivityLog as any).isPending || false}
            >
              {(updateActivityLog as any).isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
