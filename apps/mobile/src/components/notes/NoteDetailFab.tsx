import { useEffect, useState } from "react";

import { useTranslation } from "@packages/i18n";
import { Eye, Pencil, Settings } from "lucide-react-native";
import {
  Keyboard,
  Platform,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

import type { NoteDetailMode } from "./useNoteDetailPage";

type NoteDetailFabProps = {
  mode: NoteDetailMode;
  onEditPress: () => void;
  onPreviewToggle: () => void;
  onSettingsToggle: () => void;
  bottomInset?: number;
};

const ICON_SIZE = 22;

function FabButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      className="bg-gray-900 dark:bg-gray-100 rounded-full shadow-lg p-3.5 items-center justify-center"
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.8}
    >
      {children}
    </TouchableOpacity>
  );
}

export function NoteDetailFab({
  mode,
  onEditPress,
  onPreviewToggle,
  onSettingsToggle,
  bottomInset = 0,
}: NoteDetailFabProps) {
  const { t } = useTranslation("note");
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#111827" : "#f9fafb";

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s1 = Keyboard.addListener(show, (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const s2 = Keyboard.addListener(hide, () => setKeyboardHeight(0));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);

  const bottom = keyboardHeight > 0 ? keyboardHeight + 8 : 24 + bottomInset;

  if (mode === "view") {
    return (
      <View className="absolute right-6" style={{ bottom }}>
        <FabButton onPress={onEditPress} label={t("edit.editNote")}>
          <Pencil size={ICON_SIZE} color={iconColor} />
        </FabButton>
      </View>
    );
  }

  if (mode === "edit") {
    return (
      <View className="absolute right-6 gap-3" style={{ bottom }}>
        <FabButton onPress={onSettingsToggle} label={t("detail.settings")}>
          <Settings size={ICON_SIZE} color={iconColor} />
        </FabButton>
        <FabButton onPress={onPreviewToggle} label={t("tab.preview")}>
          <Eye size={ICON_SIZE} color={iconColor} />
        </FabButton>
      </View>
    );
  }

  // mode === "preview"
  return (
    <View className="absolute right-6 gap-3" style={{ bottom }}>
      <FabButton onPress={onSettingsToggle} label={t("detail.settings")}>
        <Settings size={ICON_SIZE} color={iconColor} />
      </FabButton>
      <FabButton onPress={onPreviewToggle} label={t("tab.edit")}>
        <Pencil size={ICON_SIZE} color={iconColor} />
      </FabButton>
    </View>
  );
}
