import { FlaskConical, RefreshCw } from "lucide-react-native";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { mobileTestIdsExt } from "../../testing/testIdsExt";
import {
  Divider,
  Section,
  SettingSwitch,
  type ShadowStyle,
} from "./SettingsParts";
import { useDevTools } from "./useDevTools";

// __DEV__ ビルドおよび e2e-local-* プロファイルでのみ表示する開発者向けトグル。
// production builds では EXPO_PUBLIC_E2E_MODE が undefined、__DEV__ が false の
// ため、SettingsPage 側の早期 return で本 Section 自体がレンダリングされない。
export const DEV_TOOLS_ENABLED =
  process.env.EXPO_PUBLIC_E2E_MODE === "1" ||
  (typeof __DEV__ !== "undefined" && __DEV__);

export function DevToolsSection({ shadow }: { shadow: ShadowStyle }) {
  const { offline, refreshing, handleToggleOffline, handleRefreshPlan } =
    useDevTools();

  return (
    <Section icon={FlaskConical} label="DEV TOOLS" shadow={shadow}>
      <View testID={mobileTestIdsExt.devTools.section}>
        <SettingSwitch
          label="強制オフライン"
          desc="syncEngine を停止して pending を可視化する (E2E 用)"
          value={offline}
          onChange={handleToggleOffline}
          testID={mobileTestIdsExt.devTools.forcedOfflineToggle}
        />
        <Divider />
        <TouchableOpacity
          className="flex-row items-center px-4 py-3"
          onPress={handleRefreshPlan}
          disabled={refreshing}
          accessibilityRole="button"
          accessibilityLabel="プラン情報を再取得"
          testID={mobileTestIdsExt.devTools.refreshPlanButton}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#6b7280" />
          ) : (
            <RefreshCw size={18} color="#6b7280" />
          )}
          <Text className="ml-3 text-base text-gray-700 dark:text-gray-300">
            プラン情報を再取得
          </Text>
        </TouchableOpacity>
      </View>
    </Section>
  );
}
