import { X } from "lucide-react";
import { LogFormBody } from "../common/LogFormBody";
import { ModalOverlay } from "../common/ModalOverlay";
import type { DexieActivity } from "../../db/schema";

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
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">{activity.emoji || "📝"}</span>
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
