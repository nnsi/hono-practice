import { useTranslation } from "@packages/i18n";

type Props = {
  activeTab: "active" | "archived";
  onChange: (tab: "active" | "archived") => void;
};

export function TasksTabs({ activeTab, onChange }: Props) {
  const { t } = useTranslation("task");

  return (
    <div className="sticky top-0 sticky-header z-10">
      <div className="flex items-center px-1 pr-14 h-12">
        <button
          type="button"
          onClick={() => onChange("active")}
          className={`flex-1 py-2.5 text-sm font-medium text-center rounded-xl transition-all mx-0.5 ${
            activeTab === "active"
              ? "text-gray-900 bg-white shadow-soft"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          {t("page.tab.active")}
        </button>
        <button
          type="button"
          onClick={() => onChange("archived")}
          className={`flex-1 py-2.5 text-sm font-medium text-center rounded-xl transition-all mx-0.5 ${
            activeTab === "archived"
              ? "text-gray-900 bg-white shadow-soft"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          {t("page.tab.archived")}
        </button>
      </div>
    </div>
  );
}
