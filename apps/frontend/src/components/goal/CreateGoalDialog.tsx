import { useTranslation } from "@packages/i18n";
import { X } from "lucide-react";

import type { DexieActivity } from "../../db/schema";
import { FormButton } from "../common/FormButton";
import { ModalOverlay } from "../common/ModalOverlay";
import { CreateGoalFields } from "./CreateGoalFields";
import type { CreateGoalPayload } from "./types";
import { useCreateGoalDialog } from "./useCreateGoalDialog";

export function CreateGoalDialog({
  activities,
  onClose,
  onCreate,
}: {
  activities: DexieActivity[];
  onClose: () => void;
  onCreate: (payload: CreateGoalPayload) => Promise<void>;
}) {
  const { t } = useTranslation("goal");
  const {
    activityId,
    setActivityId,
    target,
    setTarget,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dayTargetsEnabled,
    setDayTargetsEnabled,
    dayTargetValues,
    setDayTargetValues,
    debtCapEnabled,
    setDebtCapEnabled,
    debtCapValue,
    setDebtCapValue,
    submitting,
    errorMsg,
    selectedActivity,
    handleSubmit,
  } = useCreateGoalDialog(activities, onCreate);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-modal p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t("createTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <CreateGoalFields
            activities={activities}
            activityId={activityId}
            setActivityId={setActivityId}
            target={target}
            setTarget={setTarget}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            dayTargetsEnabled={dayTargetsEnabled}
            setDayTargetsEnabled={setDayTargetsEnabled}
            dayTargetValues={dayTargetValues}
            setDayTargetValues={setDayTargetValues}
            debtCapEnabled={debtCapEnabled}
            setDebtCapEnabled={setDebtCapEnabled}
            debtCapValue={debtCapValue}
            setDebtCapValue={setDebtCapValue}
            selectedActivity={selectedActivity}
            errorMsg={errorMsg}
          />

          {/* ボタン */}
          <div className="flex gap-2 pt-2">
            <FormButton
              variant="secondary"
              label={t("cancelButton")}
              onClick={onClose}
              className="flex-1"
            />
            <FormButton
              type="submit"
              variant="primary"
              label={t("createButton")}
              disabled={submitting}
              className="flex-1"
            />
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}
