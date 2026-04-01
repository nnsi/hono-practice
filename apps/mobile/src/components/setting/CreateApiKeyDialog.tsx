import { useState } from "react";

import type { ApiKeyScope } from "@packages/domain/apiKey/apiKeySchema";
import { useTranslation } from "@packages/i18n";
import type { CreateApiKeyRequest } from "@packages/types/request";
import type { CreateApiKeyResponse } from "@packages/types/response";
import { Check, Copy } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { ModalOverlay } from "../common/ModalOverlay";
import { MobileScopeSelector } from "./MobileScopeSelector";

export function CreateApiKeyDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: CreateApiKeyRequest) => Promise<CreateApiKeyResponse>;
}) {
  const { t } = useTranslation("settings");
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>(["all"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || selectedScopes.length === 0) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onCreate({
        name: name.trim(),
        scopes: selectedScopes,
      });
      setCreatedKey(result.apiKey.key);
    } catch {
      setError(t("apiKeyCreateError"));
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

  const title = createdKey ? t("apiKeyCreatedTitle") : t("apiKeyCreateTitle");

  return (
    <ModalOverlay
      visible
      onClose={onClose}
      title={title}
      footer={
        createdKey ? (
          <TouchableOpacity
            className="w-full py-2.5 bg-stone-900 rounded-lg flex-row items-center justify-center gap-2"
            onPress={handleCopy}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={copied ? t("apiKeyCopied") : t("apiKeyCopy")}
          >
            {copied ? (
              <>
                <Check size={16} color="#fff" />
                <Text className="text-white font-medium">
                  {t("apiKeyCopied")}
                </Text>
              </>
            ) : (
              <>
                <Copy size={16} color="#fff" />
                <Text className="text-white font-medium">
                  {t("apiKeyCopy")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <FormButton
            variant="primary"
            label={isSubmitting ? t("apiKeyCreating") : t("apiKeyCreated")}
            onPress={handleSubmit}
            disabled={
              isSubmitting || !name.trim() || selectedScopes.length === 0
            }
          />
        )
      }
    >
      {createdKey ? (
        <View>
          <View className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg p-3 mb-4">
            <Text className="text-sm text-amber-700 dark:text-amber-400">
              {t("apiKeyWarning")}
            </Text>
          </View>
          <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <Text
              className="text-sm text-gray-800 dark:text-gray-200 font-mono"
              selectable
            >
              {createdKey}
            </Text>
          </View>
        </View>
      ) : (
        <View>
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t("apiKeyName")}
          </Text>
          <FormInput
            className="w-full"
            value={name}
            onChangeText={setName}
            placeholder={t("apiKeyNamePlaceholder")}
            placeholderTextColor="#9ca3af"
            autoFocus
            maxLength={255}
            accessibilityLabel={t("apiKeyName")}
          />
          <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {t("apiKeyNameHint")}
          </Text>

          <View className="mt-4">
            <MobileScopeSelector
              selectedScopes={selectedScopes}
              onChange={setSelectedScopes}
            />
          </View>

          {error && (
            <Text className="text-sm text-red-600 dark:text-red-400 mt-3">
              {error}
            </Text>
          )}
        </View>
      )}
    </ModalOverlay>
  );
}
