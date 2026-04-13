import { useTranslation } from "@packages/i18n";
import { Text, View } from "react-native";

type Step = "file" | "preview";

export function CSVImportStepIndicator({ current }: { current: Step }) {
  const { t } = useTranslation("csv");
  const steps: Array<{ key: Step; label: string }> = [
    { key: "file", label: t("stepFileSelect") },
    { key: "preview", label: t("stepPreview") },
  ];
  return (
    <View className="flex-row items-center justify-center gap-2">
      {steps.map((s, i) => (
        <View key={s.key} className="flex-row items-center">
          {i > 0 && <View className="w-6 h-px bg-gray-300 mx-1" />}
          <View
            className={`px-3 py-1 rounded-full ${current === s.key ? "bg-blue-100" : "bg-gray-100 dark:bg-gray-800"}`}
          >
            <Text
              className={`text-xs font-medium ${current === s.key ? "text-blue-700" : "text-gray-400 dark:text-gray-500"}`}
            >
              {i + 1}. {s.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
