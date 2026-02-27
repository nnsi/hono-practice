import { useState, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import dayjs from "dayjs";
import { ModalOverlay } from "../common/ModalOverlay";
import { DatePickerField } from "../common/DatePickerField";
import type { CreateGoalPayload } from "./types";

type ActivityItem = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
};

type CreateGoalDialogProps = {
  visible: boolean;
  activities: ActivityItem[];
  onClose: () => void;
  onCreate: (payload: CreateGoalPayload) => Promise<void>;
};

export function CreateGoalDialog({
  visible,
  activities,
  onClose,
  onCreate,
}: CreateGoalDialogProps) {
  const [activityId, setActivityId] = useState("");
  const [target, setTarget] = useState("1");
  const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === activityId),
    [activities, activityId],
  );

  const resetForm = () => {
    setActivityId("");
    setTarget("1");
    setStartDate(dayjs().format("YYYY-MM-DD"));
    setEndDate("");
    setErrorMsg("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    setErrorMsg("");

    if (!activityId) {
      setErrorMsg("アクティビティを選択してください");
      return;
    }
    const parsedTarget = Number(target);
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setErrorMsg("日次目標は0より大きい数値を入力してください");
      return;
    }
    if (!startDate) {
      setErrorMsg("開始日を入力してください");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        activityId,
        dailyTargetQuantity: parsedTarget,
        startDate,
        ...(endDate ? { endDate } : {}),
      });
      resetForm();
    } catch {
      setErrorMsg("作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalOverlay visible={visible} onClose={handleClose} title="新しい目標を作成">
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
                {" "}({selectedActivity.quantityUnit})
              </Text>
            ) : null}
          </Text>
          <TextInput
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
            <Text className="text-sm text-gray-500 mb-1">終了日（任意）</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 text-base"
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>

        {/* Error message */}
        {errorMsg ? (
          <Text className="text-sm text-red-500">{errorMsg}</Text>
        ) : null}

        {/* Buttons */}
        <View className="flex-row gap-2 pt-2 mb-4">
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
      </View>
    </ModalOverlay>
  );
}
