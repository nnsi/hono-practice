import { useState } from "react";

import type { DayTargets } from "@packages/domain/goal/dayTargets";
import { useTranslation } from "@packages/i18n";
import { X } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { useIconBlobMap } from "../../hooks/useIconBlobMap";
import { ActivityIcon } from "../common/ActivityIcon";
import { buildDayTargets } from "./DayTargetsInput";
import { EditGoalButtons } from "./EditGoalButtons";
import { EditGoalFields } from "./EditGoalFields";
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
  const { t } = useTranslation("goal");
  const iconBlobMap = useIconBlobMap();
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
    for (const [k, v] of Object.entries(goal.dayTargets)) vals[k] = String(v);
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
      setErrorMsg(t("errorInvalidTarget"));
      return;
    }
    if (endDate && endDate < startDate) {
      setErrorMsg(t("errorInvalidEndDate"));
      return;
    }
    const parsedDebtCap = debtCapEnabled ? Number(debtCapValue) : null;
    if (
      debtCapEnabled &&
      (!Number.isFinite(parsedDebtCap) || (parsedDebtCap as number) <= 0)
    ) {
      setErrorMsg(t("errorInvalidDebtCap"));
      return;
    }
    setSaving(true);
    try {
      await onSave({
        dailyTargetQuantity: parsedTarget,
        dayTargets: dayTargetsEnabled ? buildDayTargets(dayTargetValues) : null,
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
    <View className="rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-900/20 mb-3 p-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <ActivityIcon
            iconType={activity?.iconType}
            emoji={activity?.emoji ?? "🎯"}
            iconBlob={activity ? iconBlobMap.get(goal.activityId) : undefined}
            iconUrl={activity?.iconUrl}
            iconThumbnailUrl={activity?.iconThumbnailUrl}
            size={28}
            fontSize="text-xl"
          />
          <Text className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {activity?.name ?? t("unknownActivity")}
          </Text>
        </View>
        <TouchableOpacity
          className="p-1"
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={t("cancelButton")}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={16} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <EditGoalFields
        activity={activity}
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
        errorMsg={errorMsg}
      />

      <EditGoalButtons
        saving={saving}
        showDeactivateConfirm={showDeactivateConfirm}
        showDeleteConfirm={showDeleteConfirm}
        onSave={handleSave}
        onDeactivateRequest={() => setShowDeactivateConfirm(true)}
        onDeactivateConfirm={handleDeactivate}
        onDeleteRequest={() => setShowDeleteConfirm(true)}
        onDeleteConfirm={handleDelete}
      />
    </View>
  );
}
