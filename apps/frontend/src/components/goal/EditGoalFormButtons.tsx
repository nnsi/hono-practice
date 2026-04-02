import { useTranslation } from "@packages/i18n";

import { FormButton } from "../common/FormButton";

type EditGoalFormButtonsProps = {
  saving: boolean;
  showDeactivateConfirm: boolean;
  setShowDeactivateConfirm: (v: boolean) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (v: boolean) => void;
  onDeactivate: () => void;
  onDelete: () => void;
};

export function EditGoalFormButtons({
  saving,
  showDeactivateConfirm,
  setShowDeactivateConfirm,
  showDeleteConfirm,
  setShowDeleteConfirm,
  onDeactivate,
  onDelete,
}: EditGoalFormButtonsProps) {
  const { t } = useTranslation("goal");

  return (
    <div className="flex gap-2 pt-1">
      {!showDeleteConfirm ? (
        <FormButton
          variant="danger"
          label={t("deleteButton")}
          onClick={() => setShowDeleteConfirm(true)}
          disabled={saving}
          className="px-3"
        />
      ) : (
        <FormButton
          variant="dangerConfirm"
          label={t("deleteButton")}
          onClick={onDelete}
          disabled={saving}
          className="px-3"
        />
      )}
      {!showDeactivateConfirm ? (
        <FormButton
          variant="danger"
          label={t("deactivateButton")}
          onClick={() => setShowDeactivateConfirm(true)}
          disabled={saving}
          className="px-4"
        />
      ) : (
        <FormButton
          variant="dangerConfirm"
          label={t("deactivateConfirmButton")}
          onClick={onDeactivate}
          disabled={saving}
          className="px-4"
        />
      )}
      <FormButton
        type="submit"
        variant="primary"
        label={t("saveButton")}
        disabled={saving}
        className="flex-1"
      />
    </div>
  );
}
