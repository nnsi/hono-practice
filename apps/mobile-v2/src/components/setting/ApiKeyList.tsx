import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Trash2 } from "lucide-react-native";
import type { ApiKeyResponse } from "@dtos/response";
import dayjs from "dayjs";

export function ApiKeyList({
  apiKeys,
  isLoading,
  onDelete,
}: {
  apiKeys: ApiKeyResponse[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<unknown>;
}) {
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
        <Text className="text-sm text-gray-400">APIキーがありません</Text>
      </View>
    );
  }

  return (
    <View>
      {apiKeys.map((apiKey) => (
        <View key={apiKey.id} className="border-t border-gray-100 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-900">{apiKey.name}</Text>
            {confirmDeleteId === apiKey.id ? (
              <View className="flex-row items-center gap-1.5">
                <TouchableOpacity
                  className="px-2 py-1 bg-red-600 rounded"
                  onPress={() => handleDelete(apiKey.id)}
                  disabled={deletingId === apiKey.id}
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-white">
                    {deletingId === apiKey.id ? "..." : "削除"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="px-2 py-1 border border-gray-300 rounded"
                  onPress={() => setConfirmDeleteId(null)}
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-gray-700">取消</Text>
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
          <View className="mt-1.5 bg-gray-50 px-2 py-1 rounded">
            <Text className="text-xs text-gray-400 font-mono">
              {apiKey.key.startsWith("api_") ? apiKey.key : `${"*".repeat(8)}...${apiKey.key.slice(-4)}`}
            </Text>
          </View>
          <View className="flex-row gap-3 mt-1.5">
            <Text className="text-xs text-gray-400">作成: {dayjs(apiKey.createdAt).format("YYYY/MM/DD")}</Text>
            {apiKey.lastUsedAt && (
              <Text className="text-xs text-gray-400">
                最終使用: {dayjs(apiKey.lastUsedAt).format("YYYY/MM/DD")}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
