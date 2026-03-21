import { X } from "lucide-react";

import type { DexieActivity } from "../../db/schema";
import { LogFormBody } from "../common/LogFormBody";
import { ModalOverlay } from "../common/ModalOverlay";
import { renderActivityIcon } from "../goal/activityHelpers";

export function RecordDialog({
  activity,
  date,
  onClose,
}: {
  activity: DexieActivity;
  date: string;
  onClose: () => void;
}) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-modal">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {renderActivityIcon(activity)}
            {activity.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <LogFormBody activity={activity} date={date} onDone={onClose} />
      </div>
    </ModalOverlay>
  );
}
