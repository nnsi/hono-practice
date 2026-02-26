import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { ModalOverlay } from "../common/ModalOverlay";
import { LogFormBody } from "../common/LogFormBody";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityLogRepository } from "../../repositories/activityLogRepository";

type Log = {
  id: string;
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  memo: string;
  date: string;
  time: string | null;
};

type Activity = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
};

type EditLogDialogProps = {
  visible: boolean;
  onClose: () => void;
  log: Log | null;
  activity: Activity | undefined;
};

export function EditLogDialog({
  visible,
  onClose,
  log,
  activity,
}: EditLogDialogProps) {
  const { kinds } = useActivityKinds(log?.activityId);
  const [quantity, setQuantity] = useState("");
  const [selectedKindId, setSelectedKindId] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (log) {
      setQuantity(log.quantity != null ? String(log.quantity) : "");
      setSelectedKindId(log.activityKindId);
      setMemo(log.memo);
      setDate(log.date);
      setTime(log.time || "");
    }
  }, [log]);

  const handleSave = async () => {
    if (!log) return;
    setIsSubmitting(true);
    try {
      await activityLogRepository.updateActivityLog(log.id, {
        quantity: quantity ? Number(quantity) : null,
        activityKindId: selectedKindId,
        memo,
        date,
        time: time || null,
      });
      onClose();
    } catch (e) {
      Alert.alert("エラー", "更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!log) return;
    Alert.alert("削除確認", "このログを削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          await activityLogRepository.softDeleteActivityLog(log.id);
          onClose();
        },
      },
    ]);
  };

  if (!log) return null;

  return (
    <ModalOverlay
      visible={visible}
      onClose={onClose}
      title={`${activity?.emoji || "📝"} ${activity?.name || ""} 編集`}
    >
      <LogFormBody
        quantityUnit={activity?.quantityUnit || ""}
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
        className={`mt-6 py-3 rounded-xl items-center ${
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
        className="mt-2 mb-4 py-3 rounded-xl items-center border border-red-300"
        onPress={handleDelete}
      >
        <Text className="text-red-500 font-medium text-base">削除</Text>
      </TouchableOpacity>
    </ModalOverlay>
  );
}
