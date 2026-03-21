import { useState } from "react";

import { Switch, Text, TouchableOpacity, View } from "react-native";

import { DatePickerField } from "../common/DatePickerField";
import { IMESafeTextInput } from "../common/IMESafeTextInput";
import { ModalOverlay } from "../common/ModalOverlay";
import { OptionalDatePickerField } from "../common/OptionalDatePickerField";
import { DayTargetsInput } from "./DayTargetsInput";
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
  const [debtCapEnabled, setDebtCapEnabled] = useState(false);
  const [debtCapValue, setDebtCapValue] = useState("");

  // Wrap onCreate to inject debtCap into the payload
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
      title="新しい目標を作成"
      footer={
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 py-3 border border-gray-300 rounded-lg items-center"
            onPress={handleClose}
          >
            <Text className="text-gray-700 font-medium">キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 rounded-lg items-center ${
              submitting ? "bg-gray-400" : "bg-gray-900"
            }`}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text className="text-white font-medium">作成</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View className="gap-4">
        {/* Activity selection */}
        <View>
          <Text className="text-sm font-medium text-gray-600 mb-1">
            アクティビティ
          </Text>
          {activities.length === 0 ? (
            <Text className="text-sm text-gray-400">
              アクティビティがありません
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {activities.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setActivityId(a.id)}
                  className={`items-center p-2 rounded-lg border min-w-[80px] ${
                    activityId === a.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <Text className="text-xl">{a.emoji}</Text>
                  <Text
                    className="text-[10px] mt-1 text-center"
                    numberOfLines={1}
                  >
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Daily target */}
        <View>
          <Text className="text-sm font-medium text-gray-600 mb-1">
            日次目標
            {selectedActivity?.quantityUnit ? (
              <Text className="text-xs text-gray-400">
                {" "}
                ({selectedActivity.quantityUnit})
              </Text>
            ) : null}
          </Text>
          <IMESafeTextInput
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg"
            value={target}
            onChangeText={setTarget}
            keyboardType="numeric"
            selectTextOnFocus
          />
        </View>

        {/* Dates */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <DatePickerField
              value={startDate}
              onChange={setStartDate}
              label="開始日"
            />
          </View>
          <View className="flex-1">
            <OptionalDatePickerField
              value={endDate}
              onChange={setEndDate}
              label="終了日（任意）"
            />
          </View>
        </View>

        {/* Day targets */}
        <DayTargetsInput
          enabled={dayTargetsEnabled}
          onToggle={setDayTargetsEnabled}
          values={dayTargetValues}
          onChange={setDayTargetValues}
          defaultTarget={target}
        />

        {/* Debt cap */}
        <View>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-600">
              負債上限を設定
            </Text>
            <Switch
              value={debtCapEnabled}
              onValueChange={(v) => {
                setDebtCapEnabled(v);
                if (v && !debtCapValue) {
                  setDebtCapValue(String(Number(target) * 7));
                }
              }}
            />
          </View>
          {debtCapEnabled && (
            <View className="flex-row items-center gap-2 mt-1">
              <IMESafeTextInput
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={debtCapValue}
                onChangeText={setDebtCapValue}
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text className="text-xs text-gray-500">
                {selectedActivity?.quantityUnit ?? ""}
              </Text>
            </View>
          )}
        </View>

        {/* Error message */}
        {errorMsg ? (
          <Text className="text-sm text-red-500">{errorMsg}</Text>
        ) : null}
      </View>
    </ModalOverlay>
  );
}
