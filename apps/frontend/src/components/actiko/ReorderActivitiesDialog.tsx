import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { ArrowDown, ArrowUp, X } from "lucide-react";

import { activityRepository } from "../../db/activityRepository";
import type { DexieActivity } from "../../db/schema";
import { ModalOverlay } from "../common/ModalOverlay";
import { renderActivityIcon } from "../goal/activityHelpers";

type ReorderActivitiesDialogProps = {
  activities: DexieActivity[];
  onClose: () => void;
};

export function ReorderActivitiesDialog({
  activities,
  onClose,
}: ReorderActivitiesDialogProps) {
  const { t } = useTranslation("actiko");
  const [items, setItems] = useState(activities);
  const [saving, setSaving] = useState(false);

  const swap = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await activityRepository.reorderActivities(items.map((a) => a.id));
    setSaving(false);
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {t("reorder")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((activity, index) => (
            <div
              key={activity.id}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100"
            >
              <span className="text-xl shrink-0">
                {renderActivityIcon(activity, "w-6 h-6")}
              </span>
              <span className="text-sm font-medium text-gray-800 flex-1 truncate">
                {activity.name}
              </span>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => swap(index, -1)}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-default transition-colors"
                >
                  <ArrowUp size={16} className="text-gray-600" />
                </button>
                <button
                  type="button"
                  onClick={() => swap(index, 1)}
                  disabled={index === items.length - 1}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-default transition-colors"
                >
                  <ArrowDown size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 py-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
