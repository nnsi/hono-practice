import type { TasksTab } from "@packages/frontend-shared/hooks/useTasksPage.types";
import { useTranslation } from "@packages/i18n";

type Props = {
  activeTab: TasksTab;
  onChange: (tab: TasksTab) => void;
};

const TABS: {
  key: TasksTab;
  labelKey: "page.tab.active" | "page.tab.archived" | "page.tab.schedules";
}[] = [
  { key: "active", labelKey: "page.tab.active" },
  { key: "archived", labelKey: "page.tab.archived" },
  { key: "schedules", labelKey: "page.tab.schedules" },
];

export function TasksTabs({ activeTab, onChange }: Props) {
  const { t } = useTranslation("task");

  return (
    <div className="sticky top-0 sticky-header z-10">
      <div className="flex items-center px-1 pr-14 h-12">
        {TABS.map(({ key, labelKey }) => (
          <button
            key={key}
            type="button"
            aria-current={activeTab === key ? "page" : undefined}
            onClick={() => onChange(key)}
            className={`flex-1 py-2.5 text-sm font-medium text-center rounded-xl transition-all mx-0.5 ${
              activeTab === key
                ? "text-gray-900 bg-white shadow-soft"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
