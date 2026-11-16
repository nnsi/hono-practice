import { CreateActivityDialog } from "./CreateActivityDialog";
import { EditActivityDialog } from "./EditActivityDialog";
import { RecordDialog } from "./RecordDialog";
import { ReorderActivitiesDialog } from "./ReorderActivitiesDialog";
import type { useActikoPage } from "./useActikoPage";

type PageState = ReturnType<typeof useActikoPage>;
type Activity = PageState["gridActivities"][number];

type ActikoDialogsProps = {
  recordVisible: boolean;
  onRecordClose: () => void;
  selectedActivity: Activity | null;
  date: string;
  createVisible: boolean;
  onCreateClose: () => void;
  editActivity: Activity | null;
  onEditClose: () => void;
  reorderVisible: boolean;
  onReorderClose: () => void;
  activities: Activity[];
};

// 一覧は useLiveQuery で自動更新されるので、作成・更新後にやることは無い
const noop = () => {};

export function ActikoDialogs({
  recordVisible,
  onRecordClose,
  selectedActivity,
  date,
  createVisible,
  onCreateClose,
  editActivity,
  onEditClose,
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
        onCreated={noop}
      />
      <EditActivityDialog
        key={editActivity?.id ?? "edit-closed"}
        visible={editActivity !== null}
        onClose={onEditClose}
        activity={editActivity}
        onUpdated={noop}
      />
      <ReorderActivitiesDialog
        visible={reorderVisible}
        onClose={onReorderClose}
        activities={activities}
      />
    </>
  );
}
