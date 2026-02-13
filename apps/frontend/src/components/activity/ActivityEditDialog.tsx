import type { GetActivityResponse } from "@dtos/response";
import { useActivityEdit } from "@frontend/hooks/feature/activity/useActivityEdit";

import { ActivityEditDialogView } from "./ActivityEditDialogView";

export const ActivityEditDialog = ({
  open,
  onClose,
  activity,
}: {
  open: boolean;
  onClose: () => void;
  activity: GetActivityResponse | null;
}) => {
  const { form, formProps, iconProps, actions } = useActivityEdit(
    activity,
    onClose,
  );

  if (!activity) return null;

  return (
    <ActivityEditDialogView
      open={open}
      form={form}
      kindFields={formProps.kindFields}
      isPending={formProps.isPending}
      iconProps={iconProps}
      actions={actions}
      onClose={onClose}
    />
  );
};
