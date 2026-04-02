import { useTranslation } from "@packages/i18n";
import { View } from "react-native";

import { FormButton } from "../common/FormButton";

type EditGoalButtonsProps = {
  saving: boolean;
  showDeactivateConfirm: boolean;
  showDeleteConfirm: boolean;
  onSave: () => void;
  onDeactivateRequest: () => void;
  onDeactivateConfirm: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
};

export function EditGoalButtons({
  saving,
  showDeactivateConfirm,
  showDeleteConfirm,
  onSave,
  onDeactivateRequest,
  onDeactivateConfirm,
  onDeleteRequest,
  onDeleteConfirm,
}: EditGoalButtonsProps) {
  const { t } = useTranslation("goal");

  return (
    <View className="flex-row gap-2 pt-1">
      {!showDeleteConfirm ? (
        <FormButton
          variant="danger"
          label={t("deleteButton")}
          onPress={onDeleteRequest}
          disabled={saving}
          className="px-3"
        />
      ) : (
        <FormButton
          variant="dangerConfirm"
          label={t("deleteButton")}
          onPress={onDeleteConfirm}
          disabled={saving}
          className="px-3"
        />
      )}

      {!showDeactivateConfirm ? (
        <FormButton
          variant="danger"
          label={t("deactivateButton")}
          onPress={onDeactivateRequest}
          disabled={saving}
          className="px-4"
        />
      ) : (
        <FormButton
          variant="dangerConfirm"
          label={t("deactivateConfirmButton")}
          onPress={onDeactivateConfirm}
          disabled={saving}
          className="px-4"
        />
      )}

      <FormButton
        variant="primary"
        label={t("saveButton")}
        onPress={onSave}
        disabled={saving}
        className="flex-1"
      />
    </View>
  );
}
