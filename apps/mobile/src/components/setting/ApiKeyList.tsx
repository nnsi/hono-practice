import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import type { ApiKeyResponse } from "@packages/types/response";
import dayjs from "dayjs";
import { Trash2 } from "lucide-react-native";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

export function ApiKeyList({
  apiKeys,
  isLoading,
  onDelete,
}: {
  apiKeys: ApiKeyResponse[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const { t } = useTranslation("settings");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } catch {
      // ignore
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <View className="items-center justify-center py-4">
        <ActivityIndicator size="small" color="#9ca3af" />
      </View>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <View className="px-4 py-2">
        <Text className="text-sm text-gray-400 dark:text-gray-500">
          {t("noApiKeys")}
        </Text>
      </View>
    );
  }

  return (
    <View>
      {apiKeys.map((apiKey) => (
        <View
          key={apiKey.id}
          className="border-t border-gray-100 dark:border-gray-800 px-4 py-3"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {apiKey.name}
            </Text>
            {confirmDeleteId === apiKey.id ? (
              <View className="flex-row items-center gap-1.5">
                <TouchableOpacity
                  className="px-2 py-1 bg-red-600 rounded"
                  onPress={() => handleDelete(apiKey.id)}
                  disabled={deletingId === apiKey.id}
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-white">
                    {deletingId === apiKey.id
                      ? "..."
                      : t("apiKeyDeleteConfirm")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded"
                  onPress={() => setConfirmDeleteId(null)}
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-gray-700 dark:text-gray-300">
                    {t("apiKeyDeleteCancel")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                className="p-1"
                onPress={() => setConfirmDeleteId(apiKey.id)}
                activeOpacity={0.7}
              >
                <Trash2 size={14} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <View className="mt-1.5 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
            <Text className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              {apiKey.key.startsWith("api_")
                ? apiKey.key
                : `${"*".repeat(8)}...${apiKey.key.slice(-4)}`}
            </Text>
          </View>
          <View className="flex-row gap-3 mt-1.5">
            <Text className="text-xs text-gray-400 dark:text-gray-500">
              {t("apiKeyCreated")}:{" "}
              {dayjs(apiKey.createdAt).format("YYYY/MM/DD")}
            </Text>
            {apiKey.lastUsedAt && (
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                {t("apiKeyLastUsed")}:{" "}
                {dayjs(apiKey.lastUsedAt).format("YYYY/MM/DD")}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
