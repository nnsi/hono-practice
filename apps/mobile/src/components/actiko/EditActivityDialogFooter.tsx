import { useTranslation } from "@packages/i18n";
import { View } from "react-native";

import { mobileTestIds } from "../../testing/testIds";
import { FormButton } from "../common/FormButton";

type EditActivityDialogFooterProps = {
  isSubmitting: boolean;
  nameTrimmed: boolean;
  showDeleteConfirm: boolean;
  onSave: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
};

export function EditActivityDialogFooter({
  isSubmitting,
  nameTrimmed,
  showDeleteConfirm,
  onSave,
  onDeleteRequest,
  onDeleteConfirm,
}: EditActivityDialogFooterProps) {
  const { t } = useTranslation("actiko");

  return (
    <View className="flex-row gap-2">
      {!showDeleteConfirm ? (
        <FormButton
          variant="danger"
          label={t("delete")}
          onPress={onDeleteRequest}
          className="px-4"
          testID={mobileTestIds.actikoEdit.deleteRequestButton}
        />
      ) : (
        <FormButton
          variant="dangerConfirm"
          label={t("confirmDelete")}
          onPress={onDeleteConfirm}
          disabled={isSubmitting}
          className="px-4"
          testID={mobileTestIds.actikoEdit.deleteConfirmButton}
        />
      )}
      <FormButton
        variant="primary"
        label={isSubmitting ? t("saving") : t("save")}
        onPress={onSave}
        disabled={isSubmitting || !nameTrimmed}
        className="flex-1"
        testID={mobileTestIds.actikoEdit.saveButton}
      />
    </View>
  );
}
