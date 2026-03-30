import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";
import { Pause, Play, Trash2 } from "lucide-react";

import { DatePickerField } from "../common/DatePickerField";
import { useFreezePeriodManager } from "./useFreezePeriodManager";

type FreezePeriodManagerProps = {
  goalId: string;
};

export function FreezePeriodManager({ goalId }: FreezePeriodManagerProps) {
  const { t } = useTranslation("goal");
  const {
    today,
    sorted,
    activePeriod,
    deletingId,
    setDeletingId,
    showForm,
    setShowForm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    handleFreezeToday,
    handleFreezeWithDates,
    handleResume,
    handleDelete,
    handleCancelForm,
  } = useFreezePeriodManager(goalId);

  if (!sorted) return null;

  return (
    <div className="px-4 py-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">
          {t("freezePeriodLabel")}
        </span>
        {activePeriod ? (
          <button
            type="button"
            onClick={() => handleResume(activePeriod.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
          >
            <Play size={12} />
            {t("resumeButton")}
          </button>
        ) : showForm ? null : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleFreezeToday}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Pause size={12} />
              {t("freezeTodayButton")}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t("freezeByDateButton")}
            </button>
          </div>
        )}
      </div>

      {showForm && !activePeriod && (
        <div className="mb-3 p-3 bg-blue-50 rounded-lg space-y-2">
          <div>
            <label className="text-xs text-gray-600 block mb-1">
              {t("startDateLabel")}
            </label>
            <DatePickerField value={startDate} onChange={setStartDate} />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">
              {t("endDateLabel")}
            </label>
            <DatePickerField
              value={endDate}
              onChange={setEndDate}
              placeholder={t("freezeEndDatePlaceholder")}
              allowClear
            />
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={handleCancelForm}
              className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {t("cancelButton")}
            </button>
            <button
              type="button"
              onClick={handleFreezeWithDates}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {t("freezeConfirmButton")}
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !showForm && (
        <p className="text-xs text-gray-400">{t("freezeHistoryEmpty")}</p>
      )}

      {sorted.length > 0 && (
        <ul className="space-y-1">
          {sorted.map((fp) => {
            const isActive =
              fp.startDate <= today &&
              (fp.endDate == null || fp.endDate >= today);
            return (
              <li
                key={fp.id}
                className="flex items-center justify-between text-xs py-1"
              >
                <span
                  className={`${isActive ? "text-blue-700 font-medium" : "text-gray-600"}`}
                >
                  {dayjs(fp.startDate).format("M/D")}
                  {" - "}
                  {fp.endDate
                    ? dayjs(fp.endDate).format("M/D")
                    : t("freezeInProgress")}
                </span>
                {deletingId === fp.id ? (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(fp.id)}
                      className="px-2 py-0.5 text-[11px] bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      {t("deleteButton")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="px-2 py-0.5 text-[11px] border border-gray-300 rounded hover:bg-gray-50"
                    >
                      {t("freezeCancelButton")}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeletingId(fp.id)}
                    className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <Trash2 size={12} className="text-gray-400" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
