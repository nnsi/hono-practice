import { useState } from "react";

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
  const [legalModal, setLegalModal] = useState<
    "privacy" | "terms" | "tokushoho" | null
  >(null);

  return (
    <div className="bg-white">
      <header className="sticky top-0 sticky-header z-10">
        <div className="flex items-center gap-2 px-4 pr-14 h-12">
          <Settings size={20} className="text-gray-400" />
          <h1 className="text-base font-medium">設定</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* アプリ設定 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            アプリ設定
          </h2>
          <div className="space-y-1 rounded-xl border border-gray-200">
            <SettingCheckbox
              id="show-goal-on-startup"
              label="起動時に目標画面を表示"
              description="アプリ起動時の初期画面を目標画面にします"
              checked={settings.showGoalOnStartup}
              onChange={(v) => updateSetting("showGoalOnStartup", v)}
            />
            <div className="border-t border-gray-100 mx-4" />
            <SettingCheckbox
              id="show-inactive-dates"
              label="やらなかった日付をデフォルトで表示"
              description="目標詳細で活動がなかった日付を表示します"
              checked={settings.showInactiveDates}
              onChange={(v) => updateSetting("showInactiveDates", v)}
            />
            <div className="border-t border-gray-100 mx-4" />
            <SettingCheckbox
              id="praise-mode"
              label="褒めモード"
              description="記録時のフィードバックに褒めメッセージと演出を追加します"
              checked={settings.praiseMode}
              onChange={(v) => updateSetting("praiseMode", v)}
            />
          </div>
        </section>

        <SubscriptionSection />

        {/* APIキー管理 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            API キー
          </h2>
          <ApiKeyManager />
        </section>

        <AccountSection />
        <DataManagementSection />

        {/* アプリ情報 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Info size={14} />
            アプリ情報
          </h2>
          <div className="rounded-xl border border-gray-200 p-4 space-y-2">
            <p className="text-sm text-gray-600">Actiko v2.0</p>
            <div className="border-t border-gray-100 pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setLegalModal("privacy")}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                プライバシーポリシー
              </button>
              <button
                type="button"
                onClick={() => setLegalModal("terms")}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                利用規約
              </button>
              <button
                type="button"
                onClick={() => setLegalModal("tokushoho")}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                特定商取引法に基づく表記
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
