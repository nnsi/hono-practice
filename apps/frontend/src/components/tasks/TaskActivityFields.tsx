import { useTranslation } from "@packages/i18n";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../../db/schema";
import { useActivities } from "../../hooks/useActivities";
import { FormInput } from "../common/FormInput";

type TaskActivityFieldsProps = {
  activityId: string | null;
  setActivityId: (id: string | null) => void;
  activityKindId: string | null;
  setActivityKindId: (id: string | null) => void;
  quantity: number | null;
  setQuantity: (q: number | null) => void;
  disabled?: boolean;
};

export function TaskActivityFields({
  activityId,
  setActivityId,
  activityKindId,
  setActivityKindId,
  quantity,
  setQuantity,
  disabled = false,
}: TaskActivityFieldsProps) {
  const { t } = useTranslation("task");
  const { activities } = useActivities();

  const selectedActivity = activityId
    ? activities.find((a) => a.id === activityId)
    : undefined;

  const activityKinds =
    useLiveQuery(
      () =>
        activityId
          ? db.activityKinds
              .where("activityId")
              .equals(activityId)
              .filter((k) => !k.deletedAt)
              .toArray()
          : [],
      [activityId],
    ) ?? [];

  return (
    <>
      {/* アクティビティ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("create.label.activity")}
        </label>
        <select
          value={activityId ?? ""}
          onChange={(e) => {
            setActivityId(e.target.value || null);
            setActivityKindId(null);
            setQuantity(null);
          }}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
        >
          <option value="">{t("create.none")}</option>
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.emoji} {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* ActivityKind選択 */}
      {activityId && activityKinds && activityKinds.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("create.label.kind")}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setActivityKindId(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                activityKindId === null
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t("create.none")}
            </button>
            {activityKinds.map((kind) => (
              <button
                key={kind.id}
                type="button"
                disabled={disabled}
                onClick={() => setActivityKindId(kind.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                  activityKindId === kind.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={
                  activityKindId === kind.id && kind.color
                    ? { backgroundColor: kind.color, color: "#fff" }
                    : kind.color
                      ? { borderColor: kind.color, borderWidth: 1 }
                      : undefined
                }
              >
                {kind.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 数量 */}
      {activityId && selectedActivity && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("create.label.quantity")}
            {selectedActivity.quantityUnit && (
              <span className="ml-1 text-gray-500">
                ({selectedActivity.quantityUnit})
              </span>
            )}
          </label>
          <FormInput
            type="number"
            step="any"
            value={quantity ?? ""}
            onChange={(e) =>
              setQuantity(e.target.value !== "" ? Number(e.target.value) : null)
            }
            placeholder={t("create.placeholder.quantity")}
            disabled={disabled}
          />
        </div>
      )}
    </>
  );
}
