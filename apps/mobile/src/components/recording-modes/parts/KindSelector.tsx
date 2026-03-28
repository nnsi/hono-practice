import { useTranslation } from "@packages/i18n";
import { Text, TouchableOpacity, View } from "react-native";

type KindSelectorProps = {
  kinds: { id: string; name: string; color: string | null }[];
  selectedKindId: string | null;
  onSelect: (id: string | null) => void;
};

export function KindSelector({
  kinds,
  selectedKindId,
  onSelect,
}: KindSelectorProps) {
  const { t } = useTranslation("recording");
  return (
    <View>
      <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        {t("kind")}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {kinds.map((kind) => (
          <TouchableOpacity
            key={kind.id}
            onPress={() =>
              onSelect(selectedKindId === kind.id ? null : kind.id)
            }
            className={`flex-row items-center px-3 py-1.5 rounded-full border ${
              selectedKindId === kind.id
                ? "bg-gray-900 border-gray-900"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            }`}
          >
            {kind.color && (
              <View
                className="w-2.5 h-2.5 rounded-full mr-1.5"
                style={{ backgroundColor: kind.color }}
              />
            )}
            <Text
              className={`text-sm ${
                selectedKindId === kind.id
                  ? "text-white font-medium"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {kind.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
