import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Copy, Check } from "lucide-react-native";
import { ModalOverlay } from "../common/ModalOverlay";
import type { CreateApiKeyRequest } from "@dtos/request";
import type { CreateApiKeyResponse } from "@dtos/response";

export function CreateApiKeyDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: CreateApiKeyRequest) => Promise<CreateApiKeyResponse>;
}) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onCreate({ name: name.trim() });
      setCreatedKey(result.apiKey.key);
    } catch {
      setError("APIキーの作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
    } catch {
      // fallback: do nothing if clipboard API is unavailable
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const title = createdKey ? "APIキーが作成されました" : "新しいAPIキーの作成";

  return (
    <ModalOverlay visible onClose={onClose} title={title}>
      {createdKey ? (
        <View>
          <View className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <Text className="text-sm text-amber-700">
              このAPIキーは一度しか表示されません。必ずコピーして安全に保管してください。
            </Text>
          </View>
          <View className="bg-gray-50 rounded-lg p-3 mb-4">
            <Text className="text-sm text-gray-800 font-mono" selectable>
              {createdKey}
            </Text>
          </View>
          <TouchableOpacity
            className="w-full py-2.5 bg-stone-900 rounded-lg flex-row items-center justify-center gap-2"
            onPress={handleCopy}
            activeOpacity={0.7}
          >
            {copied ? (
              <>
                <Check size={16} color="#fff" />
                <Text className="text-white font-medium">コピーしました</Text>
              </>
            ) : (
              <>
                <Copy size={16} color="#fff" />
                <Text className="text-white font-medium">APIキーをコピー</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text className="text-sm font-medium text-gray-600 mb-1">名前</Text>
          <TextInput
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base text-gray-900"
            value={name}
            onChangeText={setName}
            placeholder="例: 開発用APIキー"
            placeholderTextColor="#9ca3af"
            autoFocus
            maxLength={255}
          />
          <Text className="text-xs text-gray-400 mt-1 mb-4">
            APIキーに識別しやすい名前を付けてください
          </Text>

          {error && (
            <Text className="text-sm text-red-600 mb-3">{error}</Text>
          )}

          <TouchableOpacity
            className={`w-full py-2.5 rounded-lg ${!name.trim() || isSubmitting ? "bg-gray-300" : "bg-stone-900"}`}
            onPress={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            activeOpacity={0.7}
          >
            <Text className="text-white font-medium text-center">
              {isSubmitting ? "作成中..." : "作成"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ModalOverlay>
  );
}
