import { useState } from "react";

import { ApiKeyManager } from "@frontend/components/apiKey";
import { CSVImportModal } from "@frontend/components/csv";
import { Button, Checkbox, Label } from "@frontend/components/ui";
import { useAppSettings } from "@frontend/hooks/feature/setting/useAppSettings";
import { useUserSettings } from "@frontend/hooks/feature/setting/useUserSettings";
import { GoogleLogin } from "@react-oauth/google";
import { Upload } from "lucide-react";

export const SettingPage: React.FC = () => {
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const {
    isGoogleLinked,
    googleEmail,
    handleLogout,
    handleGoogleLink,
    handleGoogleLinkError,
  } = useUserSettings();
  const { settings, updateSetting } = useAppSettings();

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      <hr className="mt-12 mb-6" />
      <div>
        <h2 className="text-lg font-semibold mb-4">アカウント設定</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={handleLogout} variant="outline">
              ログアウト
            </Button>
            <GoogleLogin
              onSuccess={handleGoogleLink}
              onError={handleGoogleLinkError}
            />
            {isGoogleLinked && (
              <div className="flex flex-col">
                <span className="text-green-600 text-sm">Google連携済み</span>
                {googleEmail && (
                  <span className="text-gray-600 text-xs">{googleEmail}</span>
                )}
              </div>
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
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-inactive-dates"
              checked={settings.showInactiveDates}
              onCheckedChange={(checked: boolean) =>
                updateSetting("showInactiveDates", checked)
              }
            />
            <Label
              htmlFor="show-inactive-dates"
              className="flex flex-col gap-1 cursor-pointer"
            >
              <span>やらなかった日付をデフォルトで表示</span>
              <span className="text-sm text-gray-500">
                目標詳細で活動がなかった日付を表示します
              </span>
            </Label>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">データ管理</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCSVModalOpen(true)}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Upload className="h-4 w-4 mr-2" />
              CSVから活動記録をインポート
            </Button>
            {process.env.NODE_ENV === "development" && (
              <>
                <Button
                  onClick={() => {
                    // テスト用CSVデータを作成
                    const testCSV = `date,activity,kind,quantity,memo
2025-01-20,読書,,30,既存アクティビティテスト
2025-01-21,プログラミング,,60,TypeScript本を読んだ
2025-01-22,勉強,,120,資格勉強
2025-01-23,筋トレ,,30,ジムでトレーニング
2025-01-24,ランニング,,5,朝ラン
2025-01-25,invalid_date,テスト,30,日付エラー
2025-01-26,読書,,-10,数量エラー
2025-01-27,,テスト,30,アクティビティ名欠落`;
                    // UTF-8 BOMを追加
                    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
                    const blob = new Blob([bom, testCSV], {
                      type: "text/csv;charset=utf-8;",
                    });
                    const file = new File([blob], "test_activity_logs.csv", {
                      type: "text/csv",
                    });

                    // モーダルを開く
                    setIsCSVModalOpen(true);

                    // モーダルが開いた後にファイルを設定
                    setTimeout(() => {
                      const fileInput = document.getElementById(
                        "csv-file",
                      ) as HTMLInputElement;
                      if (fileInput) {
                        // FileListを擬似的に作成
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        fileInput.dispatchEvent(
                          new Event("change", { bubbles: true }),
                        );
                      }
                    }, 100);
                  }}
                  variant="outline"
                  className="bg-yellow-50 hover:bg-yellow-100"
                >
                  🧪 テストCSVを生成
                </Button>
                <Button
                  onClick={() => {
                    // 最小CSVデータを作成（date,countのみ）
                    const minimalCSV = `date,count
2025-01-26,30
2025-01-27,45
2025-01-28,60
2025-01-29,20
2025-01-30,90`;
                    // UTF-8 BOMを追加
                    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
                    const blob = new Blob([bom, minimalCSV], {
                      type: "text/csv;charset=utf-8;",
                    });
                    const file = new File([blob], "minimal_activity_logs.csv", {
                      type: "text/csv",
                    });

                    // モーダルを開く
                    setIsCSVModalOpen(true);

                    // モーダルが開いた後にファイルを設定
                    setTimeout(() => {
                      const fileInput = document.getElementById(
                        "csv-file",
                      ) as HTMLInputElement;
                      if (fileInput) {
                        // FileListを擬似的に作成
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        fileInput.files = dataTransfer.files;
                        fileInput.dispatchEvent(
                          new Event("change", { bubbles: true }),
                        );
                      }
                    }, 100);
                  }}
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100"
                >
                  📄 最小CSVを生成
                </Button>
              </>
            )}
          </div>
          <p className="text-sm text-gray-500">
            CSVファイルから過去の活動記録を一括でインポートできます。
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">APIキー管理</h2>
        <ApiKeyManager />
      </div>

      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
      />
    </div>
  );
};
