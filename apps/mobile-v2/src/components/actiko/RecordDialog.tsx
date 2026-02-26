import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import dayjs from "dayjs";
import { ModalOverlay } from "../common/ModalOverlay";
import { LogFormBody } from "../common/LogFormBody";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityLogRepository } from "../../repositories/activityLogRepository";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
};

type RecordDialogProps = {
  visible: boolean;
  onClose: () => void;
  activity: Activity | null;
  initialQuantity?: string;
};

export function RecordDialog({
  visible,
  onClose,
  activity,
  initialQuantity,
}: RecordDialogProps) {
  const { kinds } = useActivityKinds(activity?.id);
  const [quantity, setQuantity] = useState("");
  const [selectedKindId, setSelectedKindId] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [time, setTime] = useState(dayjs().format("HH:mm"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialQuantity !== undefined) {
      setQuantity(initialQuantity);
    }
  }, [initialQuantity]);

  const resetForm = () => {
    setQuantity("");
    setSelectedKindId(null);
    setMemo("");
    setDate(dayjs().format("YYYY-MM-DD"));
    setTime(dayjs().format("HH:mm"));
  };

  const handleRecord = async () => {
    if (!activity) return;
    setIsSubmitting(true);
    try {
      await activityLogRepository.createActivityLog({
        activityId: activity.id,
        activityKindId: selectedKindId,
        quantity: quantity ? Number(quantity) : null,
        memo,
        date,
        time: time || null,
      });
      resetForm();
      onClose();
    } catch (e) {
      Alert.alert("エラー", "記録の保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!activity) return null;

  return (
    <ModalOverlay
      visible={visible}
      onClose={handleClose}
      title={`${activity.emoji} ${activity.name}`}
    >
      <LogFormBody
        quantityUnit={activity.quantityUnit}
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

      <TouchableOpacity
        className={`mt-6 mb-4 py-3 rounded-xl items-center ${
          isSubmitting ? "bg-blue-300" : "bg-blue-500"
        }`}
        onPress={handleRecord}
        disabled={isSubmitting}
      >
        <Text className="text-white font-bold text-base">
          {isSubmitting ? "記録中..." : "記録する"}
        </Text>
      </TouchableOpacity>
    </ModalOverlay>
  );
}
