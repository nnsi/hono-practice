import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { ArrowLeft, Check, Copy } from "lucide-react-native";
import {
  Clipboard,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { mobileTestIds } from "../../testing/testIds";

type NoteDetailHeaderProps = {
  content: string;
  saveState: "idle" | "saving" | "saved";
  onBack: () => void;
};

export function NoteDetailHeader({
  content,
  saveState,
  onBack,
}: NoteDetailHeaderProps) {
  const { t } = useTranslation("note");
  const [copied, setCopied] = useState(false);

  const handleCopyPlainText = async () => {
    try {
      if (Platform.OS === "web") {
        await navigator.clipboard.writeText(content);
      } else {
        Clipboard.setString(content);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <View className="flex-row items-center border-b border-gray-100 px-2 h-12 dark:border-gray-800">
      <TouchableOpacity
        onPress={onBack}
        className="mr-1 p-2"
        hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
        accessibilityRole="button"
        accessibilityLabel={t("detail.back")}
        testID={mobileTestIds.notes.backButton}
      >
        <ArrowLeft size={22} color="#6b7280" />
      </TouchableOpacity>

      <View className="flex-1" />

      <View className="ml-2 flex-row items-center gap-3">
        {saveState !== "idle" && (
          <Text className="text-xs text-gray-400 dark:text-gray-500">
            {saveState === "saving" ? t("detail.saving") : t("detail.saved")}
          </Text>
        )}
        <TouchableOpacity
          onPress={handleCopyPlainText}
          accessibilityRole="button"
          accessibilityLabel={
            copied ? t("detail.copied") : t("detail.copyPlainText")
          }
          className="h-10 w-10 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600"
        >
          {copied ? (
            <Check size={18} color="#059669" />
          ) : (
            <Copy size={18} color="#374151" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
