import type { GetActivityLogResponse } from "@dtos/response";
import { useActivityLogEdit } from "@frontend/hooks/feature/daily/useActivityLogEdit";

import { ActivityLogEditDialogView } from "./ActivityLogEditDialogView";

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
  const { formProps, actions } = useActivityLogEdit(open, onOpenChange, log);

  if (!log) return null;

  return (
    <ActivityLogEditDialogView
      open={open}
      onOpenChange={onOpenChange}
      log={log}
      formProps={formProps}
      actions={actions}
    />
  );
};
