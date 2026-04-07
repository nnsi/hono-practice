import { useTranslation } from "@packages/i18n";

import type { DexieActivity } from "../../db/schema";

export function NoteActivitySelect({
  activityId,
  activities,
  onChange,
}: {
  activityId: string | null;
  activities: DexieActivity[];
  onChange: (id: string | null) => void;
}) {
  const { t } = useTranslation("note");

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t("create.label.activity")}
      </label>
      <select
        value={activityId ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
      >
        <option value="">{t("create.none")}</option>
        {activities.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  );
}
