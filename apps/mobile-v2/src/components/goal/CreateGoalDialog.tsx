import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import dayjs from "dayjs";
import { ModalOverlay } from "../common/ModalOverlay";
import { DatePickerField } from "../common/DatePickerField";
import { useActivities } from "../../hooks/useActivities";
import { goalRepository } from "../../repositories/goalRepository";

type CreateGoalDialogProps = {
  visible: boolean;
  onClose: () => void;
};

export function CreateGoalDialog({
  visible,
  onClose,
}: CreateGoalDialogProps) {
  const { activities } = useActivities();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null
  );
  const [dailyTarget, setDailyTarget] = useState("");
  const [startDate, setStartDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setSelectedActivityId(null);
    setDailyTarget("");
    setStartDate(dayjs().format("YYYY-MM-DD"));
    setEndDate("");
    setDescription("");
  };

  const handleCreate = async () => {
    if (!selectedActivityId) {
      Alert.alert("エラー", "アクティビティを選択してください");
      return;
    }
    if (!dailyTarget || Number(dailyTarget) <= 0) {
      Alert.alert("エラー", "日間目標を入力してください");
      return;
    }
    setIsSubmitting(true);
    try {
      await goalRepository.createGoal({
        activityId: selectedActivityId,
        dailyTargetQuantity: Number(dailyTarget),
        startDate,
        endDate: endDate || null,
        description,
      });
      resetForm();
      onClose();
    } catch (e) {
      Alert.alert("エラー", "目標の作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <ModalOverlay visible={visible} onClose={handleClose} title="目標作成">
      <View className="gap-4">
        {/* Activity picker */}
        <View>
          <Text className="text-sm text-gray-500 mb-1">アクティビティ</Text>
          <View className="flex-row flex-wrap gap-2">
            {activities.map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => setSelectedActivityId(a.id)}
                className={`px-3 py-2 rounded-lg border ${
                  selectedActivityId === a.id
                    ? "bg-blue-500 border-blue-500"
                    : "bg-white border-gray-300"
                }`}
              >
                <Text
                  className={`text-sm ${
                    selectedActivityId === a.id
                      ? "text-white font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {a.emoji} {a.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <Text className="text-sm text-gray-500 mb-1">日間目標数量</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            value={dailyTarget}
            onChangeText={setDailyTarget}
            keyboardType="numeric"
            placeholder="例: 30"
          />
        </View>

        <DatePickerField
          value={startDate}
          onChange={setStartDate}
          label="開始日"
        />

        <View>
          <Text className="text-sm text-gray-500 mb-1">
            終了日（任意 YYYY-MM-DD）
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD（空欄で無期限）"
          />
        </View>

        <View>
          <Text className="text-sm text-gray-500 mb-1">説明（任意）</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            value={description}
            onChangeText={setDescription}
            placeholder="目標の説明"
            multiline
            numberOfLines={2}
          />
        </View>

        <TouchableOpacity
          className={`mt-2 mb-4 py-3 rounded-xl items-center ${
            isSubmitting || !selectedActivityId
              ? "bg-blue-300"
              : "bg-blue-500"
          }`}
          onPress={handleCreate}
          disabled={isSubmitting || !selectedActivityId}
        >
          <Text className="text-white font-bold text-base">
            {isSubmitting ? "作成中..." : "作成"}
          </Text>
        </TouchableOpacity>
      </View>
    </ModalOverlay>
  );
}
