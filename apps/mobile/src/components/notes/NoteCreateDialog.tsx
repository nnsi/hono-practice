import { Text, View } from "react-native";

import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { FormTextarea } from "../common/FormTextarea";
import { ModalOverlay } from "../common/ModalOverlay";
import { useNoteCreateDialog } from "./useNoteCreateDialog";

export function NoteCreateDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { title, setTitle, content, setContent, isSubmitting, handleCreate } =
    useNoteCreateDialog(onSuccess);

  return (
    <ModalOverlay
      visible
      onClose={onClose}
      title="New Note"
      footer={
        <View className="flex-row gap-2">
          <FormButton
            variant="secondary"
            label="Cancel"
            onPress={onClose}
            className="flex-1"
          />
          <FormButton
            variant="primary"
            label={isSubmitting ? "Creating..." : "Create"}
            onPress={handleCreate}
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
