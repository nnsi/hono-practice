import { CreateActivityDialog } from "./CreateActivityDialog";
import { EditActivityDialog } from "./EditActivityDialog";
import { RecordDialog } from "./RecordDialog";
import { ReorderActivitiesDialog } from "./ReorderActivitiesDialog";
import type { useActikoPage } from "./useActikoPage";

type PageState = ReturnType<typeof useActikoPage>;
type Activity = PageState["activities"][number];

type ActikoDialogsProps = {
  recordVisible: boolean;
  onRecordClose: () => void;
  selectedActivity: Activity | null;
  date: string;
  createVisible: boolean;
  onCreateClose: () => void;
  editActivity: Activity | null;
  onEditClose: () => void;
  onActivityChanged: () => void;
  reorderVisible: boolean;
  onReorderClose: () => void;
  activities: Activity[];
};

export function ActikoDialogs({
  recordVisible,
  onRecordClose,
  selectedActivity,
  date,
  createVisible,
  onCreateClose,
  editActivity,
  onEditClose,
  onActivityChanged,
  reorderVisible,
  onReorderClose,
  activities,
}: ActikoDialogsProps) {
  return (
    <>
      <RecordDialog
        visible={recordVisible}
        onClose={onRecordClose}
        activity={selectedActivity}
        date={date}
      />
      <CreateActivityDialog
        visible={createVisible}
        onClose={onCreateClose}
        onCreated={onActivityChanged}
      />
      <EditActivityDialog
        visible={editActivity !== null}
        onClose={onEditClose}
        activity={editActivity}
        onUpdated={onActivityChanged}
      />
      <ReorderActivitiesDialog
        visible={reorderVisible}
        onClose={onReorderClose}
        activities={activities}
      />
    </>
  );
}
