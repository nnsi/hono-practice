import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { Tag } from "lucide-react";

type Activity = {
  id: string;
  name: string;
};

type NoteActivityChipsProps = {
  activityId: string | null;
  onChangeActivityId: (value: string | null) => void;
  activities: Activity[];
};

function OptionChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        selected
          ? "border-gray-900 bg-gray-900 font-medium text-white"
          : "border-gray-300 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

export function NoteActivityChips({
  activityId,
  onChangeActivityId,
  activities,
}: NoteActivityChipsProps) {
  const { t } = useTranslation("note");
  const [expanded, setExpanded] = useState(false);

  const selectedActivity = activities.find((a) => a.id === activityId);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label={t("create.label.activity")}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
      >
        <Tag size={14} className="text-gray-400" />
        {selectedActivity?.name ?? t("detail.activityNone")}
      </button>
    );
  }

  const select = (value: string | null) => {
    onChangeActivityId(value);
    setExpanded(false);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <OptionChip
        label={t("create.none")}
        selected={activityId === null}
        onClick={() => select(null)}
      />
      {activities.map((activity) => (
        <OptionChip
          key={activity.id}
          label={activity.name}
          selected={activityId === activity.id}
          onClick={() => select(activity.id)}
        />
      ))}
    </div>
  );
}
