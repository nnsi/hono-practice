import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { ExternalLink, Lock } from "lucide-react-native";
import {
  ActivityIndicator,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
} from "../../hooks/useApiKeys";
import { useSubscription } from "../../hooks/useSubscription";
import { ApiKeyList } from "./ApiKeyList";
import { CreateApiKeyDialog } from "./CreateApiKeyDialog";

export function ApiKeyManager({ shadow }: { shadow: object }) {
  const { t } = useTranslation("settings");
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const canUseApiKey = subscription?.canUseApiKey ?? false;
  const { data: apiKeysData, isLoading: keysLoading } = useApiKeys({
    enabled: canUseApiKey,
  });
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (subLoading) {
    return (
      <View
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 items-center justify-center"
        style={shadow}
      >
        <ActivityIndicator size="small" color="#9ca3af" />
      </View>
    );
  }

  if (!subscription?.canUseApiKey) {
    return (
      <View
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4"
        style={shadow}
      >
        <View className="flex-row items-center gap-2 mb-1">
          <Lock size={16} color="#6b7280" />
          <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("premiumFeature")}
          </Text>
        </View>
        <Text className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {t("premiumFeatureDescription")}
        </Text>
      </View>
    );
  }

  return (
    <View
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={shadow}
    >
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-1 mr-3">
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {t("apiKeyManagement")}
          </Text>
          <TouchableOpacity
            className="flex-row items-center gap-1 mt-1"
            onPress={() => {
              const webUrl = process.env.EXPO_PUBLIC_WEB_URL;
              if (webUrl) Linking.openURL(`${webUrl}/api-reference`);
            }}
            activeOpacity={0.7}
          >
            <Text className="text-xs text-blue-600">API Reference</Text>
            <ExternalLink size={12} color="#2563eb" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          className="px-3 py-1.5 bg-stone-900 rounded-lg"
          onPress={() => setShowCreateDialog(true)}
          activeOpacity={0.7}
        >
          <Text className="text-sm text-white font-medium">
            {t("createNewKey")}
          </Text>
        </TouchableOpacity>
      </View>

      <ApiKeyList
        apiKeys={apiKeysData?.apiKeys ?? []}
        isLoading={keysLoading}
        onDelete={deleteApiKey.mutateAsync}
      />

      {showCreateDialog && (
        <CreateApiKeyDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={createApiKey.mutateAsync}
        />
      )}
    </View>
  );
}
