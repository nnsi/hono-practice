import { useTranslation } from "@packages/i18n";
import { Text, TouchableOpacity, View } from "react-native";

import { FormInput } from "../common/FormInput";
import { KindColorPicker } from "./KindColorPicker";

type Kind = {
  id?: string;
  name: string;
  color: string;
};

type KindsListProps = {
  kindEntries: Kind[];
  onAddKind: () => void;
  onRemoveKind: (index: number) => void;
  onUpdateKindName: (index: number, name: string) => void;
  onUpdateKindColor: (index: number, color: string) => void;
};

export function KindsList({
  kindEntries,
  onAddKind,
  onRemoveKind,
  onUpdateKindName,
  onUpdateKindColor,
}: KindsListProps) {
  const { t } = useTranslation("actiko");

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
            onChangeText={(text) => onUpdateKindName(index, text)}
            placeholder={t("kindPlaceholder")}
          />
          <KindColorPicker
            color={kind.color}
            onColorChange={(c) => onUpdateKindColor(index, c)}
          />
          <TouchableOpacity
            onPress={() => onRemoveKind(index)}
            className="px-2 py-1"
          >
            <Text className="text-red-500 dark:text-red-400 text-base">-</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={onAddKind}>
        <Text className="text-sm text-blue-600 dark:text-blue-400 font-medium">
          {t("addKind")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
