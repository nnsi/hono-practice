import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { Text, TouchableOpacity, View } from "react-native";

import { ModalOverlay } from "../common/ModalOverlay";
import { CreateGoalForm } from "./CreateGoalForm";
import type { Activity, CreateGoalPayload } from "./types";
import { useCreateGoalDialog } from "./useCreateGoalDialog";

type CreateGoalDialogProps = {
  visible: boolean;
  activities: Activity[];
  onClose: () => void;
  onCreate: (payload: CreateGoalPayload) => Promise<void>;
};

export function CreateGoalDialog({
  visible,
  activities,
  onClose,
  onCreate,
}: CreateGoalDialogProps) {
  const { t } = useTranslation("goal");
  const [debtCapEnabled, setDebtCapEnabled] = useState(false);
  const [debtCapValue, setDebtCapValue] = useState("");

  const onCreateWithDebtCap = async (payload: CreateGoalPayload) => {
    const debtCap = debtCapEnabled ? Number(debtCapValue) : null;
    await onCreate({ ...payload, debtCap });
  };

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
    submitting,
    errorMsg,
    selectedActivity,
    resetForm: resetFormBase,
    handleSubmit,
  } = useCreateGoalDialog(activities, onCreateWithDebtCap);

  const resetForm = () => {
    resetFormBase();
    setDebtCapEnabled(false);
    setDebtCapValue("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <ModalOverlay
      visible={visible}
      onClose={handleClose}
      title={t("createTitle")}
      footer={
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg items-center"
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel={t("cancelButton")}
          >
            <Text className="text-gray-700 dark:text-gray-300 font-medium">
              {t("cancelButton")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 rounded-lg items-center ${
              submitting ? "bg-gray-400" : "bg-gray-900"
            }`}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={t("createButton")}
            accessibilityState={{ disabled: submitting }}
          >
            <Text className="text-white font-medium">{t("createButton")}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <CreateGoalForm
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
    </ModalOverlay>
  );
}
