import type { ApiKeyScope } from "@packages/domain/apiKey/apiKeySchema";
import { useTranslation } from "@packages/i18n";
import { Text, View } from "react-native";

function useScopeLabel() {
  const { t } = useTranslation("settings");
  return (scope: ApiKeyScope): string => {
    switch (scope) {
      case "all":
        return t("apiKeyScopeAll");
      case "activity-logs:read":
        return t("apiKeyScopeActivityLogsRead");
      case "activity-logs:write":
        return t("apiKeyScopeActivityLogsWrite");
      case "tasks:read":
        return t("apiKeyScopeTasksRead");
      case "tasks:write":
        return t("apiKeyScopeTasksWrite");
      case "voice":
        return t("apiKeyScopeVoice");
    }
  };
}

export function MobileScopeBadges({ scopes }: { scopes: ApiKeyScope[] }) {
  const getScopeLabel = useScopeLabel();

  return (
    <View className="flex-row flex-wrap gap-1 mt-1">
      {scopes.map((scope) => (
        <View
          key={scope}
          className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded"
        >
          <Text className="text-xs text-gray-600 dark:text-gray-400">
            {getScopeLabel(scope)}
          </Text>
        </View>
      ))}
    </View>
  );
}
