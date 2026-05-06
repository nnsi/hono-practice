import { useTranslation } from "@packages/i18n";
import { X } from "lucide-react-native";
import { TextInput, TouchableOpacity, View } from "react-native";

import { mobileTestIds } from "../../testing/testIds";

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export function NotesSearchBar({
  value,
  onChangeText,
  onClear,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation("note");

  return (
    <View className="px-4 pt-2 pb-1 border-b border-gray-100 dark:border-gray-800">
      <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3">
        <TextInput
          className="flex-1 py-2 text-sm text-gray-900 dark:text-gray-100"
          placeholder={t("list.search.placeholder")}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          testID={mobileTestIds.notes.searchInput}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={onClear}
            hitSlop={HIT_SLOP}
            className="ml-2 p-1"
            accessibilityRole="button"
            accessibilityLabel={t("list.search.clear")}
            testID={mobileTestIds.notes.searchClear}
          >
            <X size={16} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
