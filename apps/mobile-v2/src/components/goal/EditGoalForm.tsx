import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { ModalOverlay } from "../common/ModalOverlay";
import { DatePickerField } from "../common/DatePickerField";
import { goalRepository } from "../../repositories/goalRepository";

type Goal = {
  id: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  description: string;
};

type EditGoalFormProps = {
  visible: boolean;
  onClose: () => void;
  goal: Goal | null;
  activityName: string;
};

export function EditGoalForm({
  visible,
  onClose,
  goal,
  activityName,
}: EditGoalFormProps) {
  const [dailyTarget, setDailyTarget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (goal) {
      setDailyTarget(String(goal.dailyTargetQuantity));
      setStartDate(goal.startDate);
      setEndDate(goal.endDate || "");
      setIsActive(goal.isActive);
      setDescription(goal.description);
    }
  }, [goal]);

  const handleSave = async () => {
    if (!goal) return;
    if (!dailyTarget || Number(dailyTarget) <= 0) {
      Alert.alert("エラー", "日間目標を入力してください");
      return;
    }
    setIsSubmitting(true);
    try {
      await goalRepository.updateGoal(goal.id, {
        dailyTargetQuantity: Number(dailyTarget),
        startDate,
        endDate: endDate || null,
        isActive,
        description,
      });
      onClose();
    } catch (e) {
      Alert.alert("エラー", "更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!goal) return;
    Alert.alert("削除確認", "この目標を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          await goalRepository.softDeleteGoal(goal.id);
          onClose();
        },
      },
    ]);
  };

  if (!goal) return null;

  return (
    <ModalOverlay visible={visible} onClose={onClose} title="目標編集">
      <View className="gap-4">
        <View className="p-3 bg-gray-50 rounded-lg">
          <Text className="text-sm text-gray-500">アクティビティ</Text>
          <Text className="text-base font-medium text-gray-800">
            {activityName}
          </Text>
        </View>

        <View>
          <Text className="text-sm text-gray-500 mb-1">日間目標数量</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            value={dailyTarget}
            onChangeText={setDailyTarget}
            keyboardType="numeric"
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

        <View className="flex-row items-center justify-between py-2">
          <Text className="text-sm text-gray-700">有効</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
            thumbColor={isActive ? "#3b82f6" : "#f4f4f5"}
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
          className={`mt-2 py-3 rounded-xl items-center ${
            isSubmitting ? "bg-blue-300" : "bg-blue-500"
          }`}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          <Text className="text-white font-bold text-base">
            {isSubmitting ? "保存中..." : "保存"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="mb-4 py-3 rounded-xl items-center border border-red-300"
          onPress={handleDelete}
        >
          <Text className="text-red-500 font-medium text-base">削除</Text>
        </TouchableOpacity>
      </View>
    </ModalOverlay>
  );
}
