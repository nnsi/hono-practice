import { ApiKeyManager } from "@frontend/components/apiKey";
import { Button, Checkbox, Label } from "@frontend/components/ui";
import { useAppSettings } from "@frontend/hooks/feature/setting/useAppSettings";
import { useUserSettings } from "@frontend/hooks/feature/setting/useUserSettings";
import { GoogleLogin } from "@react-oauth/google";

export const SettingPage: React.FC = () => {
  const {
    isGoogleLinked,
    handleLogout,
    handleGoogleLink,
    handleGoogleLinkError,
  } = useUserSettings();
  const { settings, updateSetting } = useAppSettings();

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-4">アカウント設定</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={handleLogout} variant="outline">
              ログアウト
            </Button>
            {isGoogleLinked ? (
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-medium">
                  Google認証済み
                </span>
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleLink}
                onError={handleGoogleLinkError}
              />
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">アプリ設定</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-goal-on-startup"
              checked={settings.showGoalOnStartup}
              onCheckedChange={(checked: boolean) =>
                updateSetting("showGoalOnStartup", checked)
              }
            />
            <Label
              htmlFor="show-goal-on-startup"
              className="flex flex-col gap-1 cursor-pointer"
            >
              <span>起動時に目標画面を表示</span>
              <span className="text-sm text-gray-500">
                アプリ起動時の初期画面を目標画面にします
              </span>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hide-goal-graph"
              checked={settings.hideGoalGraph}
              onCheckedChange={(checked: boolean) =>
                updateSetting("hideGoalGraph", checked)
              }
            />
            <Label
              htmlFor="hide-goal-graph"
              className="flex flex-col gap-1 cursor-pointer"
            >
              <span>目標グラフを非表示</span>
              <span className="text-sm text-gray-500">
                負債時間と未実施日のみを表示します
              </span>
            </Label>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">APIキー管理</h2>
        <ApiKeyManager />
      </div>
    </div>
  );
};
