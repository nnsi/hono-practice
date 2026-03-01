import { useState, useEffect, useCallback } from "react";
import { Settings, Database, Info, Key, Trash2, UserCircle, Check, Upload, Download, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { db } from "../../db/schema";
import { ApiKeyManager } from "./ApiKeyManager";
import { GoogleSignInButton } from "../root/GoogleSignInButton";
import { CSVImportModal } from "../csv/CSVImportModal";
import { CSVExportModal } from "../csv/CSVExportModal";
import { apiClient, clearToken } from "../../utils/apiClient";
import { clearLocalData } from "../../sync/initialSync";

const AppSettingsSchema = z.object({
  showGoalOnStartup: z.boolean(),
  hideGoalGraph: z.boolean(),
  showInactiveDates: z.boolean(),
});

type AppSettings = z.infer<typeof AppSettingsSchema>;

const defaultSettings: AppSettings = { showGoalOnStartup: false, hideGoalGraph: false, showInactiveDates: false };

function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem("actiko-v2-settings");
    if (stored) {
      try {
        const parsed = AppSettingsSchema.safeParse(JSON.parse(stored));
        if (parsed.success) return parsed.data;
        localStorage.removeItem("actiko-v2-settings");
      } catch {
        localStorage.removeItem("actiko-v2-settings");
      }
    }
    return defaultSettings;
  });

  const updateSetting = (key: keyof AppSettings, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("actiko-v2-settings", JSON.stringify(next));
      return next;
    });
  };

  return { settings, updateSetting };
}

function useGoogleAccount() {
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchUserInfo = useCallback(async () => {
    const res = await apiClient.user.me.$get();
    if (!res.ok) return;
    const user = await res.json();
    setIsGoogleLinked(user.providers?.includes("google") ?? false);
    setGoogleEmail(user.providerEmails?.google ?? null);
  }, []);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const linkGoogle = async (credential: string) => {
    setIsLinking(true);
    setMessage(null);
    const res = await apiClient.auth.google.link.$post({
      json: { credential },
    });
    setIsLinking(false);
    if (!res.ok) {
      setMessage({ type: "error", text: "Google連携に失敗しました" });
      return;
    }
    setMessage({ type: "success", text: "Google連携が完了しました" });
    await fetchUserInfo();
  };

  return { isGoogleLinked, googleEmail, isLinking, message, linkGoogle };
}

export function SettingsPage() {
  const { settings, updateSetting } = useAppSettings();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showCSVExport, setShowCSVExport] = useState(false);
  const google = useGoogleAccount();

  const handleClearData = async () => {
    await clearLocalData();
    window.location.reload();
  };

  const handleDeleteAccount = async () => {
    try {
      await apiClient.user.me.$delete();
    } catch {
      // オフライン時もローカル削除は続行
    }
    await db.delete();
    clearToken();
    localStorage.removeItem("actiko-v2-settings");
    window.location.href = "/";
  };

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
              id="hide-goal-graph"
              label="目標グラフを非表示"
              description="負債時間と未実施日のみを表示します"
              checked={settings.hideGoalGraph}
              onChange={(v) => updateSetting("hideGoalGraph", v)}
            />
            <div className="border-t border-gray-100 mx-4" />
            <SettingCheckbox
              id="show-inactive-dates"
              label="やらなかった日付をデフォルトで表示"
              description="目標詳細で活動がなかった日付を表示します"
              checked={settings.showInactiveDates}
              onChange={(v) => updateSetting("showInactiveDates", v)}
            />
          </div>
        </section>

        {/* アカウント設定 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <UserCircle size={14} />
            アカウント設定
          </h2>
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            {google.isGoogleLinked && (
              <div className="flex items-center gap-2">
                <Check size={16} className="text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-700">Google連携済み</p>
                  {google.googleEmail && (
                    <p className="text-xs text-gray-500 truncate">{google.googleEmail}</p>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {!google.isGoogleLinked && (
                <p className="text-sm text-gray-600">
                  Googleアカウントを連携すると、Googleでログインできるようになります。
                </p>
              )}
              <GoogleSignInButton
                onSuccess={google.linkGoogle}
                onError={() => {}}
              />
              {google.isLinking && (
                <p className="text-xs text-gray-500">連携中...</p>
              )}
            </div>
            {google.message && (
              <p className={`text-xs ${google.message.type === "success" ? "text-green-600" : "text-red-500"}`}>
                {google.message.text}
              </p>
            )}
            <div className="border-t border-gray-100 mt-3 pt-3">
              {!showDeleteAccountConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteAccountConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <AlertTriangle size={16} />
                  アカウントを削除
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-red-700 font-medium">
                    アカウントを削除すると、ローカルに保存されたデータが全て削除されます。この操作は取り消せません。
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      削除する
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteAccountConfirm(false)}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* APIキー管理 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Key size={14} />
            APIキー管理
          </h2>
          <ApiKeyManager />
        </section>

        {/* データ管理 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Database size={14} />
            データ管理
          </h2>
          <div className="rounded-xl border border-gray-200 p-4 space-y-4">
            <button
              type="button"
              onClick={() => setShowCSVImport(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Upload size={16} />
              CSVから活動記録をインポート
            </button>
            <button
              type="button"
              onClick={() => setShowCSVExport(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Download size={16} />
              活動記録をCSVにエクスポート
            </button>
            <div className="border-t border-gray-100" />
            <p className="text-sm text-gray-600 leading-relaxed">
              アクティビティや記録データはブラウザのローカルストレージ（IndexedDB）に保存されています。サーバーとの同期によりデータは復元可能です。
            </p>
            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} />
                ローカルデータを削除
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <p className="text-sm text-red-700 font-medium">
                  ローカルに保存されたデータをすべて削除します。次回アクセス時にサーバーから再同期されます。本当に削除しますか？
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClearData}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    削除する
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* アプリ情報 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Info size={14} />
            アプリ情報
          </h2>
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Actiko v2.0</p>
          </div>
        </section>
      </div>

      {showCSVImport && (
        <CSVImportModal onClose={() => setShowCSVImport(false)} />
      )}
      {showCSVExport && (
        <CSVExportModal onClose={() => setShowCSVExport(false)} />
      )}
    </div>
  );
}

function SettingCheckbox({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 accent-blue-600 shrink-0"
      />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        <span className="text-xs text-gray-500">{description}</span>
      </div>
    </label>
  );
}
