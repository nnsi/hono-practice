import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { Trash2, X } from "lucide-react";

import type { DexieActivity } from "../../db/schema";
import { DatePickerField } from "../common/DatePickerField";
import { getActivityIcon } from "./activityHelpers";
import { DayTargetsInput, buildDayTargets } from "./DayTargetsInput";
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

        {/* 日次目標 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t("dailyTargetLabel")}{" "}
            {activity?.quantityUnit && `(${activity.quantityUnit})`}
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="any"
          />
        </div>

        {/* 日付 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t("startDateLabel")}
            </label>
            <DatePickerField value={startDate} onChange={setStartDate} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t("endDateLabel")}
            </label>
            <DatePickerField
              value={endDate}
              onChange={setEndDate}
              placeholder={t("endDatePlaceholder")}
              allowClear
            />
          </div>
        </div>

        {/* 曜日別目標 */}
        <DayTargetsInput
          enabled={dayTargetsEnabled}
          onToggle={setDayTargetsEnabled}
          values={dayTargetValues}
          onChange={setDayTargetValues}
          defaultTarget={target}
        />

        {/* 負債上限 */}
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <input
              type="checkbox"
              checked={debtCapEnabled}
              onChange={(e) => {
                setDebtCapEnabled(e.target.checked);
                if (e.target.checked && !debtCapValue) {
                  setDebtCapValue(String(Number(target) * 7));
                }
              }}
              className="rounded"
            />
            {t("debtCapLabel")}
          </label>
          {debtCapEnabled && (
            <div className="flex items-center gap-1 mt-1">
              <input
                type="number"
                inputMode="decimal"
                value={debtCapValue}
                onChange={(e) => setDebtCapValue(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="any"
              />
              <span className="text-xs text-gray-500">
                {activity?.quantityUnit ?? ""}
              </span>
            </div>
          )}
        </div>

        {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}

        {/* ボタン */}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {t("saveButton")}
          </button>
          {!showDeactivateConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeactivateConfirm(true)}
              disabled={saving}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {t("deactivateButton")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {t("deactivateConfirmButton")}
            </button>
          )}
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={saving}
              className="px-3 py-2 border border-red-300 text-red-500 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {t("deleteButton")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
