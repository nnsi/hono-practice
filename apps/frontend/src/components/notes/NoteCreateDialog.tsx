import { X } from "lucide-react";

import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { FormTextarea } from "../common/FormTextarea";
import { ModalOverlay } from "../common/ModalOverlay";
import { NoteActivitySelect } from "./NoteActivitySelect";
import { useNoteCreateDialog } from "./useNoteCreateDialog";

export function NoteCreateDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const {
    title,
    setTitle,
    content,
    setContent,
    activityId,
    setActivityId,
    activities,
    isSubmitting,
    handleSubmit,
  } = useNoteCreateDialog(onSuccess);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-modal p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">New Note</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <FormInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <FormTextarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Content (Markdown supported)"
              rows={6}
            />
          </div>

          <NoteActivitySelect
            activityId={activityId}
            activities={activities}
            onChange={setActivityId}
          />

          <div className="flex gap-2 pt-2">
            <FormButton
              variant="secondary"
              label="Cancel"
              onClick={onClose}
              className="flex-1"
            />
            <FormButton
              type="submit"
              variant="primary"
              label={isSubmitting ? "Saving..." : "Save"}
              disabled={isSubmitting || !title.trim()}
              className="flex-1"
            />
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
