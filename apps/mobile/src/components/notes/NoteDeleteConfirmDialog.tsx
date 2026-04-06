import { Text, View } from "react-native";

import { FormButton } from "../common/FormButton";
import { ModalOverlay } from "../common/ModalOverlay";

export function NoteDeleteConfirmDialog({
  noteTitle,
  onConfirm,
  onCancel,
}: {
  noteTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalOverlay
      visible
      onClose={onCancel}
      title="Delete Note"
      footer={
        <View className="flex-row gap-2">
          <FormButton
            variant="secondary"
            label="Cancel"
            onPress={onCancel}
            className="flex-1"
          />
          <FormButton
            variant="dangerConfirm"
            label="Delete"
            onPress={onConfirm}
            className="flex-1"
          />
        </View>
      }
    >
      <Text className="text-sm text-gray-500 dark:text-gray-400">
        This action cannot be undone. The note "{noteTitle}" will be permanently
        deleted.
      </Text>
    </ModalOverlay>
  );
}
