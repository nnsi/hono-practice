import { useState } from "react";

import type { DayTargets } from "@packages/domain/goal/dayTargets";
import { Trash2, X } from "lucide-react-native";
import { Switch, Text, TouchableOpacity, View } from "react-native";

import { DatePickerField } from "../common/DatePickerField";
import { IMESafeTextInput } from "../common/IMESafeTextInput";
import { OptionalDatePickerField } from "../common/OptionalDatePickerField";
import { DayTargetsInput, buildDayTargets } from "./DayTargetsInput";
import type { Activity, UpdateGoalPayload } from "./types";

type GoalForEdit = {
  id: string;
  activityId: string;
  dailyTargetQuantity: number;
  dayTargets?: DayTargets | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  debtCap?: number | null;
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
  const [dayTargetsEnabled, setDayTargetsEnabled] = useState(
    goal.dayTargets != null,
  );
  const [dayTargetValues, setDayTargetValues] = useState<
    Record<string, string>
  >(() => {
    if (!goal.dayTargets) return {};
    const vals: Record<string, string> = {};
    for (const [k, v] of Object.entries(goal.dayTargets)) {
      vals[k] = String(v);
    }
    return vals;
  });
  const [debtCapEnabled, setDebtCapEnabled] = useState(goal.debtCap != null);
  const [debtCapValue, setDebtCapValue] = useState(
    String(goal.debtCap ?? goal.dailyTargetQuantity * 7),
  );
  const [saving, setSaving] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSave = async () => {
    setErrorMsg("");
    const parsedTarget = Number(target);
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setErrorMsg("日次目標は0より大きい数値を入力してください");
      return;
    }
    if (endDate && endDate < startDate) {
      setErrorMsg("終了日は開始日より後の日付にしてください");
      return;
    }
    const parsedDebtCap = debtCapEnabled ? Number(debtCapValue) : null;
    if (debtCapEnabled) {
      if (!Number.isFinite(parsedDebtCap) || (parsedDebtCap as number) <= 0) {
        setErrorMsg("負債上限は0より大きい数値を入力してください");
        return;
      }
    }
    setSaving(true);
    try {
      const dayTargets = dayTargetsEnabled
        ? buildDayTargets(dayTargetValues)
        : null;
      await onSave({
        dailyTargetQuantity: parsedTarget,
        dayTargets,
        startDate,
        endDate: endDate || null,
        debtCap: parsedDebtCap,
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
        <IMESafeTextInput
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
          <OptionalDatePickerField
            value={endDate}
            onChange={setEndDate}
            label="終了日"
          />
        </View>
      </View>

      {/* Day targets */}
      <View className="mb-3">
        <DayTargetsInput
          enabled={dayTargetsEnabled}
          onToggle={setDayTargetsEnabled}
          values={dayTargetValues}
          onChange={setDayTargetValues}
          defaultTarget={target}
        />
      </View>

      {/* Debt cap */}
      <View className="mb-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-medium text-gray-600">
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
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              value={debtCapValue}
              onChangeText={setDebtCapValue}
              keyboardType="numeric"
              selectTextOnFocus
            />
            <Text className="text-xs text-gray-500">
              {activity?.quantityUnit ?? ""}
            </Text>
          </View>
        )}
      </View>

      {errorMsg ? (
        <Text className="text-red-500 text-sm mb-2">{errorMsg}</Text>
      ) : null}

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
