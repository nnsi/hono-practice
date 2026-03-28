import { Text } from "react-native";

import { useIconBlobMap } from "../../hooks/useIconBlobMap";
import { ActivityIcon } from "../common/ActivityIcon";
import { LogFormBody } from "../common/LogFormBody";
import { ModalOverlay } from "../common/ModalOverlay";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  iconType?: "emoji" | "upload" | "generate";
  iconUrl?: string | null;
  iconThumbnailUrl?: string | null;
  quantityUnit: string;
  recordingMode: string;
  recordingModeConfig?: string | null;
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
  const iconBlobMap = useIconBlobMap();

  if (!activity) return null;

  return (
    <ModalOverlay
      visible={visible}
      onClose={onClose}
      title={
        <>
          <ActivityIcon
            iconType={activity.iconType}
            emoji={activity.emoji || "\ud83d\udcdd"}
            iconBlob={iconBlobMap.get(activity.id)}
            iconUrl={activity.iconUrl}
            iconThumbnailUrl={activity.iconThumbnailUrl}
            size={24}
            fontSize="text-xl"
          />
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {activity.name}
          </Text>
        </>
      }
    >
      <LogFormBody activity={activity} date={date} onDone={onClose} />
    </ModalOverlay>
  );
}
