import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { Info, Settings } from "lucide-react";

import { LegalModal } from "../common/LegalModal";
import { AccountSection } from "./AccountSection";
import { ApiKeyManager } from "./ApiKeyManager";
import { DataManagementSection } from "./DataManagementSection";
import { SettingCheckbox } from "./SettingCheckbox";
import { SubscriptionSection } from "./SubscriptionSection";
import { useAppSettings } from "./useAppSettings";

export function SettingsPage() {
  const { settings, updateSetting } = useAppSettings();
  const { t } = useTranslation("settings");
  const [legalModal, setLegalModal] = useState<
    "privacy" | "terms" | "tokushoho" | null
  >(null);

  return (
    <div className="bg-white">
      <header className="sticky top-0 sticky-header z-10">
        <div className="flex items-center gap-2 px-4 pr-14 h-12">
          <Settings size={20} className="text-gray-400" />
          <h1 className="text-base font-medium">{t("heading")}</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t("appSettings")}
          </h2>
          <div className="space-y-1 rounded-xl border border-gray-200">
            <SettingCheckbox
              id="show-goal-on-startup"
              label={t("showGoalOnStartup")}
              description={t("showGoalOnStartupDesc")}
              checked={settings.showGoalOnStartup}
              onChange={(v) => updateSetting("showGoalOnStartup", v)}
            />
            <div className="border-t border-gray-100 mx-4" />
            <SettingCheckbox
              id="show-inactive-dates"
              label={t("showInactiveDates")}
              description={t("showInactiveDatesDesc")}
              checked={settings.showInactiveDates}
              onChange={(v) => updateSetting("showInactiveDates", v)}
            />
            <div className="border-t border-gray-100 mx-4" />
            <SettingCheckbox
              id="praise-mode"
              label={t("praiseMode")}
              description={t("praiseModeDesc")}
              checked={settings.praiseMode}
              onChange={(v) => updateSetting("praiseMode", v)}
            />
          </div>
        </section>

        <SubscriptionSection />

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t("apiKeys")}
          </h2>
          <ApiKeyManager />
        </section>

        <AccountSection />
        <DataManagementSection />

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Info size={14} />
            {t("appInfo")}
          </h2>
          <div className="rounded-xl border border-gray-200 p-4 space-y-2">
            <p className="text-sm text-gray-600">{t("version")}</p>
            <div className="border-t border-gray-100 pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setLegalModal("privacy")}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                {t("privacyPolicy")}
              </button>
              <button
                type="button"
                onClick={() => setLegalModal("terms")}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                {t("termsOfService")}
              </button>
              <button
                type="button"
                onClick={() => setLegalModal("tokushoho")}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                {t("commercialTransactions")}
              </button>
            </div>
          </div>
        </section>
      </div>

      {legalModal && (
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </div>
  );
}
