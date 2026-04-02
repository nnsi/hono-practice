import { useTranslation } from "@packages/i18n";
import { Trash2 } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { FormInput } from "../common/FormInput";
import { useModalScroll } from "../common/ModalOverlay";
import { KindColorPicker } from "./KindColorPicker";

type KindEntry = {
  id?: string;
  name: string;
  color: string;
};

type EditActivityKindListProps = {
  kindEntries: KindEntry[];
  onUpdateName: (index: number, text: string) => void;
  onUpdateColor: (index: number, color: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
};

export function EditActivityKindList({
  kindEntries,
  onUpdateName,
  onUpdateColor,
  onRemove,
  onAdd,
}: EditActivityKindListProps) {
  const { t } = useTranslation("actiko");
  const { scrollToEnd } = useModalScroll();

  return (
    <View>
      <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        {t("kinds")}
      </Text>
      {kindEntries.map((kind, index) => (
        <View
          key={kind.id ?? `new-${index}`}
          className="flex-row items-center mb-2 gap-2"
        >
          <FormInput
            className="flex-1"
            value={kind.name}
            onChangeText={(text) => onUpdateName(index, text)}
            placeholder={t("kindPlaceholder")}
            accessibilityLabel={t("kindPlaceholder")}
          />
          <KindColorPicker
            color={kind.color}
            onColorChange={(c) => onUpdateColor(index, c)}
          />
          <TouchableOpacity
            onPress={() => onRemove(index)}
            className="p-1.5"
            accessibilityRole="button"
            accessibilityLabel={`Remove ${kind.name}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={16} className="text-red-500 dark:text-red-400" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        onPress={() => {
          onAdd();
          scrollToEnd();
        }}
        accessibilityRole="button"
        accessibilityLabel={t("addKind")}
      >
        <Text className="text-sm text-blue-600 dark:text-blue-400 font-medium">
          {t("addKind")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
