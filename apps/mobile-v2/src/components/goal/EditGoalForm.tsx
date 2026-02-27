import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { X, Trash2 } from "lucide-react-native";
import { DatePickerField } from "../common/DatePickerField";
import type { Activity, UpdateGoalPayload } from "./types";

type GoalForEdit = {
  id: string;
  activityId: string;
  dailyTargetQuantity: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
};

export function EditGoalForm({
  goal,
  activity,
  onCancel,
  onSave,
  onDelete,
}: {
  goal: GoalForEdit;
  activity: Activity | null;
  onCancel: () => void;
  onSave: (payload: UpdateGoalPayload) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [target, setTarget] = useState(String(goal.dailyTargetQuantity));
  const [startDate, setStartDate] = useState(goal.startDate);
  const [endDate, setEndDate] = useState(goal.endDate ?? "");
  const [saving, setSaving] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    const parsedTarget = Number(target);
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) return;
    setSaving(true);
    try {
      await onSave({
        dailyTargetQuantity: parsedTarget,
        startDate,
        endDate: endDate || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setSaving(true);
    try {
      await onSave({ isActive: false });
    } finally {
      setSaving(false);
      setShowDeactivateConfirm(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await onDelete();
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <View className="rounded-xl border-2 border-blue-300 bg-blue-50/30 mb-3 p-4">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-xl">{activity?.emoji ?? "🎯"}</Text>
          <Text className="font-semibold text-sm text-gray-900">
            {activity?.name ?? "不明なアクティビティ"}
          </Text>
        </View>
        <TouchableOpacity className="p-1" onPress={onCancel}>
          <X size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Daily target */}
      <View className="mb-3">
        <Text className="text-xs font-medium text-gray-600 mb-1">
          日次目標{activity?.quantityUnit ? ` (${activity.quantityUnit})` : ""}
        </Text>
        <TextInput
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          value={target}
          onChangeText={setTarget}
          keyboardType="numeric"
          selectTextOnFocus
        />
      </View>

      {/* Dates */}
      <View className="flex-row gap-3 mb-3">
        <View className="flex-1">
          <DatePickerField
            value={startDate}
            onChange={setStartDate}
            label="開始日"
          />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-medium text-gray-600 mb-1">終了日</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            value={endDate}
            onChangeText={setEndDate}
            placeholder="未設定"
          />
        </View>
      </View>

      {/* Buttons */}
      <View className="flex-row gap-2 pt-1">
        {/* Save */}
        <TouchableOpacity
          className={`flex-1 py-2 rounded-lg items-center ${
            saving ? "bg-gray-400" : "bg-gray-900"
          }`}
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-white text-sm font-medium">保存</Text>
        </TouchableOpacity>

        {/* Deactivate (2-step) */}
        {!showDeactivateConfirm ? (
          <TouchableOpacity
            className="px-4 py-2 bg-orange-500 rounded-lg items-center"
            onPress={() => setShowDeactivateConfirm(true)}
            disabled={saving}
          >
            <Text className="text-white text-sm font-medium">終了</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="px-4 py-2 bg-red-600 rounded-lg items-center"
            onPress={handleDeactivate}
            disabled={saving}
          >
            <Text className="text-white text-sm font-medium">本当に終了</Text>
          </TouchableOpacity>
        )}

        {/* Delete (2-step) */}
        {!showDeleteConfirm ? (
          <TouchableOpacity
            className="px-3 py-2 border border-red-300 rounded-lg items-center justify-center"
            onPress={() => setShowDeleteConfirm(true)}
            disabled={saving}
          >
            <Trash2 size={14} color="#ef4444" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="px-3 py-2 bg-red-500 rounded-lg items-center justify-center"
            onPress={handleDelete}
            disabled={saving}
          >
            <Text className="text-white text-sm">削除</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
