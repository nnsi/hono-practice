import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Lock } from "lucide-react-native";
import { useSubscription } from "../../hooks/useSubscription";
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "../../hooks/useApiKeys";
import { ApiKeyList } from "./ApiKeyList";
import { CreateApiKeyDialog } from "./CreateApiKeyDialog";

export function ApiKeyManager({ shadow }: { shadow: object }) {
  const { data: subscription, isLoading: subLoading } = useSubscription();
  const canUseApiKey = subscription?.canUseApiKey ?? false;
  const { data: apiKeysData, isLoading: keysLoading } = useApiKeys({ enabled: canUseApiKey });
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (subLoading) {
    return (
      <View className="bg-white rounded-2xl border border-gray-200 p-6 items-center justify-center" style={shadow}>
        <ActivityIndicator size="small" color="#9ca3af" />
      </View>
    );
  }

  if (!subscription?.canUseApiKey) {
    return (
      <View className="bg-white rounded-2xl border border-gray-200 p-4" style={shadow}>
        <View className="flex-row items-center gap-2 mb-1">
          <Lock size={16} color="#6b7280" />
          <Text className="text-sm font-medium text-gray-500">プレミアムプラン限定機能</Text>
        </View>
        <Text className="text-sm text-gray-500 leading-relaxed">
          APIキー機能はプレミアムプラン以上のユーザーのみご利用いただけます。プランをアップグレードすることで、外部アプリケーションからのアクセスが可能になります。
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden" style={shadow}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-sm text-gray-600 flex-1 mr-3">
          外部アプリケーションからアクセスするためのAPIキーを管理します
        </Text>
        <TouchableOpacity
          className="px-3 py-1.5 bg-stone-900 rounded-lg"
          onPress={() => setShowCreateDialog(true)}
          activeOpacity={0.7}
        >
          <Text className="text-sm text-white font-medium">+ 新規作成</Text>
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
