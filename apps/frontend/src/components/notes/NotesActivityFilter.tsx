import { useTranslation } from "@packages/i18n";

type FilterActivity = {
  id: string;
  name: string;
};

export function NotesActivityFilter({
  activities,
  selectedActivityId,
  onSelect,
}: {
  activities: FilterActivity[];
  selectedActivityId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useTranslation("note");

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-thin py-1 -mx-4 px-4">
      <FilterChip
        label={t("list.filter.all")}
        active={selectedActivityId === null}
        onClick={() => onSelect(null)}
      />
      {activities.map((activity) => (
        <FilterChip
          key={activity.id}
          label={activity.name}
          active={selectedActivityId === activity.id}
          onClick={() => onSelect(activity.id)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 h-8 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${
        active
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
