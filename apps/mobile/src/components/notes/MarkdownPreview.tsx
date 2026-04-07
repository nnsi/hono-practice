import { useTranslation } from "@packages/i18n";
import { useColorScheme } from "nativewind";
import { Text, View } from "react-native";
import Markdown from "react-native-marked";

export function MarkdownPreview({ content }: { content: string }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useTranslation("note");

  if (!content.trim()) {
    return (
      <Text className="text-sm text-gray-400 dark:text-gray-500 italic">
        {t("preview.empty")}
      </Text>
    );
  }

  return (
    <View className="flex-1">
      <Markdown
        value={content}
        flatListProps={{ scrollEnabled: false }}
        theme={{
          colors: {
            text: isDark ? "#e5e7eb" : "#1f2937",
            background: isDark ? "#1f2937" : "#f9fafb",
            code: isDark ? "#374151" : "#f3f4f6",
            link: isDark ? "#60a5fa" : "#2563eb",
            border: isDark ? "#4b5563" : "#e5e7eb",
          },
        }}
      />
    </View>
  );
}
