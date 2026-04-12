import { useTranslation } from "@packages/i18n";
import { GripVertical } from "lucide-react";

import { WEB_TAB_METADATA } from "../root/tabMetadata";
import { useTabCustomization } from "./useTabCustomization";

export function TabCustomizationSection() {
  const { t } = useTranslation("settings");
  const {
    preference,
    visibleTabs,
    hiddenKeys,
    draggingKey,
    showMaxWarning,
    fixedTabKey,
    hideTab,
    showTab,
    handleDragStart,
    handleDragOver,
    finishDrag,
  } = useTabCustomization();

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t("tabCustomization")}
        </h2>
        {preference.syncStatus === "pending" && (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700">
            {t("tabSyncPending")}
          </span>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-600">{t("tabCustomizationDesc")}</p>
        <p className="text-xs text-gray-400">{t("tabCustomizationHint")}</p>
        {showMaxWarning && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {t("tabMaxReached")}
          </p>
        )}

        <div className="space-y-2">
          {visibleTabs.map((key, index) => {
            const tab = WEB_TAB_METADATA[key];
            const Icon = tab.icon;
            const isFixed = key === fixedTabKey;
            const isDragging = draggingKey === key;

            return (
              <div
                key={key}
                draggable={!isFixed}
                onDragStart={handleDragStart(key, index)}
                onDragOver={handleDragOver(index)}
                onDrop={(event) => {
                  event.preventDefault();
                  finishDrag();
                }}
                onDragEnd={finishDrag}
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                  isDragging
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <GripVertical
                  size={16}
                  className={
                    isFixed ? "text-gray-300" : "cursor-grab text-gray-400"
                  }
                />
                <Icon size={18} className="text-gray-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {tab.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {isFixed ? t("tabFixed") : t("tabVisible")}
                  </div>
                </div>
                {!isFixed && (
                  <button
                    type="button"
                    onClick={() => hideTab(key)}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    {t("tabHide")}
                  </button>
                )}
              </div>
            );
          })}

          {hiddenKeys.map((key) => {
            const tab = WEB_TAB_METADATA[key];
            const Icon = tab.icon;
            return (
              <div
                key={key}
                className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 px-3 py-3"
              >
                <Icon size={18} className="text-gray-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-800">
                    {tab.label}
                  </div>
                  <div className="text-xs text-gray-500">{t("tabHidden")}</div>
                </div>
                <button
                  type="button"
                  onClick={() => showTab(key)}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  {t("tabShow")}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
