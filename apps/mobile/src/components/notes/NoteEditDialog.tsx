import type { NoteRecord } from "@packages/domain/note/noteRecord";
import type { Syncable } from "@packages/domain/sync/syncableRecord";
import { Text, View } from "react-native";

import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { FormTextarea } from "../common/FormTextarea";
import { ModalOverlay } from "../common/ModalOverlay";
import { useNoteEditDialog } from "./useNoteEditDialog";

export function NoteEditDialog({
  note,
  onClose,
  onSuccess,
  onDelete,
}: {
  note: Syncable<NoteRecord>;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: (id: string) => void;
}) {
  const { title, setTitle, content, setContent, isSubmitting, handleSave } =
    useNoteEditDialog(note, onSuccess);

  return (
    <ModalOverlay
      visible
      onClose={onClose}
      title="Edit Note"
      footer={
        <View className="flex-row gap-2">
          <FormButton
            variant="danger"
            label="Delete"
            onPress={() => onDelete(note.id)}
            className="flex-1"
          />
          <FormButton
            variant="primary"
            label={isSubmitting ? "Saving..." : "Save"}
            onPress={handleSave}
            disabled={isSubmitting || !title.trim()}
            className="flex-1"
          />
        </View>
      }
    >
      <View className="gap-4 pb-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title <Text className="text-red-500 dark:text-red-400">*</Text>
          </Text>
          <FormInput
            value={title}
            onChangeText={setTitle}
            placeholder="Note title"
            autoFocus
            accessibilityLabel="Title"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Content
          </Text>
          <FormTextarea
            value={content}
            onChangeText={setContent}
            placeholder="Write your note..."
            numberOfLines={6}
            style={{ textAlignVertical: "top", minHeight: 120 }}
            accessibilityLabel="Content"
          />
        </View>
      </View>
    </ModalOverlay>
  );
}
