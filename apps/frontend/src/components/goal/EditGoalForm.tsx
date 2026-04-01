import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { X } from "lucide-react";

import type { DexieActivity } from "../../db/schema";
import { getActivityIcon } from "./activityHelpers";
import { buildDayTargets } from "./DayTargetsInput";
import { EditGoalFields } from "./EditGoalFields";
import { EditGoalFormButtons } from "./EditGoalFormButtons";
import type { Goal, UpdateGoalPayload } from "./types";

export function EditGoalForm({
  goal,
  activity,
  onCancel,
  onSave,
  onDelete,
}: {
  goal: Goal;
  activity: DexieActivity | undefined;
  onCancel: () => void;
  onSave: (payload: UpdateGoalPayload) => Promise<void>;
  onDelete: () => void;
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
  const { t } = useTranslation("goal");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
    if (debtCapEnabled) {
      if (!Number.isFinite(parsedDebtCap) || (parsedDebtCap as number) <= 0) {
        setErrorMsg(t("errorInvalidDebtCap"));
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

  return (
    <div className="rounded-xl border-2 border-blue-300 bg-blue-50/30 shadow-sm">
      <form onSubmit={handleSave} className="p-4 space-y-3">
        {/* ヘッダー */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            {getActivityIcon(activity)}
            <span className="font-semibold text-sm">
              {activity?.name ?? t("unknownActivity")}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 hover:bg-gray-200 rounded-md"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

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

        <EditGoalFormButtons
          saving={saving}
          showDeactivateConfirm={showDeactivateConfirm}
          setShowDeactivateConfirm={setShowDeactivateConfirm}
          showDeleteConfirm={showDeleteConfirm}
          setShowDeleteConfirm={setShowDeleteConfirm}
          onDeactivate={handleDeactivate}
          onDelete={onDelete}
        />
      </form>
    </div>
  );
}
