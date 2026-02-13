import React from "react";

import type {
  GetActivityLogResponse,
  GetActivityResponse,
} from "@dtos/response";

import { useActivityLogEdit } from "../../hooks/feature/daily/useActivityLogEdit";
import { ActivityLogEditDialogView } from "./ActivityLogEditDialogView";

type ActivityLogEditDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  log: GetActivityLogResponse;
  activities: GetActivityResponse[];
};

export default React.memo(function ActivityLogEditDialog({
  isOpen,
  onClose,
  log,
  activities,
}: ActivityLogEditDialogProps) {
  const { formProps, actions } = useActivityLogEdit(
    isOpen,
    onClose,
    log,
    activities,
  );

  return (
    <ActivityLogEditDialogView
      isOpen={isOpen}
      onClose={onClose}
      log={log}
      formProps={formProps}
      actions={actions}
    />
  );
});
