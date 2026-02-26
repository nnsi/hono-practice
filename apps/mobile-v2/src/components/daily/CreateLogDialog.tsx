import { useState, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import dayjs from "dayjs";
import { ModalOverlay } from "../common/ModalOverlay";
import { LogFormBody } from "../common/LogFormBody";
import { useActivities } from "../../hooks/useActivities";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityLogRepository } from "../../repositories/activityLogRepository";

type CreateLogDialogProps = {
  visible: boolean;
  onClose: () => void;
  initialDate: string;
};

export function CreateLogDialog({
  visible,
  onClose,
  initialDate,
}: CreateLogDialogProps) {
  const { activities } = useActivities();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null
  );
  const { kinds } = useActivityKinds(selectedActivityId ?? undefined);
  const [quantity, setQuantity] = useState("");
  const [selectedKindId, setSelectedKindId] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(dayjs().format("HH:mm"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === selectedActivityId),
    [activities, selectedActivityId]
  );

  const resetForm = () => {
    setSelectedActivityId(null);
    setQuantity("");
    setSelectedKindId(null);
    setMemo("");
    setDate(initialDate);
    setTime(dayjs().format("HH:mm"));
  };

  const handleCreate = async () => {
    if (!selectedActivityId) {
      Alert.alert("エラー", "アクティビティを選択してください");
      return;
    }
    setIsSubmitting(true);
    try {
      await activityLogRepository.createActivityLog({
        activityId: selectedActivityId,
        activityKindId: selectedKindId,
        quantity: quantity ? Number(quantity) : null,
        memo,
        date,
        time: time || null,
      });
      resetForm();
      onClose();
    } catch (e) {
      Alert.alert("エラー", "ログの作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <ModalOverlay
      visible={visible}
      onClose={handleClose}
      title="ログ作成"
    >
      <View className="gap-4">
        {/* Activity picker */}
        <View>
          <Text className="text-sm text-gray-500 mb-1">アクティビティ</Text>
          <View className="flex-row flex-wrap gap-2">
            {activities.map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => {
                  setSelectedActivityId(a.id);
                  setSelectedKindId(null);
                }}
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

        {selectedActivity ? (
          <LogFormBody
            quantityUnit={selectedActivity.quantityUnit}
            kinds={kinds}
            quantity={quantity}
            onQuantityChange={setQuantity}
            selectedKindId={selectedKindId}
            onKindSelect={setSelectedKindId}
            memo={memo}
            onMemoChange={setMemo}
            date={date}
            onDateChange={setDate}
            time={time}
            onTimeChange={setTime}
          />
        ) : null}

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
