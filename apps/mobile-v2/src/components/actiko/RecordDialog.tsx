import { ModalOverlay } from "../common/ModalOverlay";
import { LogFormBody } from "../common/LogFormBody";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
};

type RecordDialogProps = {
  visible: boolean;
  onClose: () => void;
  activity: Activity | null;
  date: string;
  initialQuantity?: string;
};

export function RecordDialog({
  visible,
  onClose,
  activity,
  date,
}: RecordDialogProps) {
  if (!activity) return null;

  return (
    <ModalOverlay
      visible={visible}
      onClose={onClose}
      title={`${activity.emoji || "\ud83d\udcdd"} ${activity.name}`}
    >
      <LogFormBody activity={activity} date={date} onDone={onClose} />
    </ModalOverlay>
  );
}
