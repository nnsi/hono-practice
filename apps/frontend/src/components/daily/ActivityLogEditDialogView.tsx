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
import type { GetActivityLogResponse } from "@dtos/response";
import type {
  ActivityLogEditActions,
  ActivityLogEditFormProps,
} from "@packages/frontend-shared/hooks/feature";

export type ActivityLogEditDialogViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: GetActivityLogResponse;
  formProps: ActivityLogEditFormProps;
  actions: ActivityLogEditActions;
};

export function ActivityLogEditDialogView({
  open,
  onOpenChange,
  log,
  formProps,
  actions,
}: ActivityLogEditDialogViewProps) {
  const {
    memo,
    quantity,
    activityKindId,
    activity,
    isUpdatePending,
    isDeletePending,
  } = formProps;

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
        <form onSubmit={actions.onSubmit} className="flex flex-col gap-4">
          <div className="flex items-center">
            <div className="flex flex-1 w-full items-center gap-1">
              <Input
                value={quantity ?? ""}
                onChange={(e) => actions.onQuantityChange(e.target.value)}
                className="w-24"
                inputMode="numeric"
                autoComplete="off"
              />
              <span>{activity?.quantityUnit ?? log.activity.quantityUnit}</span>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={actions.onDelete}
              disabled={isDeletePending}
            >
              {isDeletePending ? "削除中..." : "削除"}
            </Button>
          </div>
          {activity?.kinds && activity.kinds.length > 0 && (
            <RadioGroup
              className="flex"
              value={activityKindId}
              onValueChange={actions.onActivityKindChange}
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
            onChange={(e) => actions.onMemoChange(e.target.value)}
            className="h-24"
            placeholder="メモ"
            autoComplete="off"
          />
          <DialogFooter className="flex-shrink-0">
            <Button type="submit" disabled={isUpdatePending}>
              {isUpdatePending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
