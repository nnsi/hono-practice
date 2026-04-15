import { useEffect, useState } from "react";

import { useTranslation } from "@packages/i18n";
import { Settings } from "lucide-react-native";
import {
  Keyboard,
  Platform,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

import { mobileTestIds } from "../../testing/testIds";

type NoteDetailFabProps = {
  onSettingsToggle: () => void;
  bottomInset?: number;
};

const ICON_SIZE = 22;

function FabButton({
  onPress,
  label,
  testID,
  children,
}: {
  onPress: () => void;
  label: string;
  testID?: string;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      className="items-center justify-center rounded-full bg-gray-900 p-3.5 shadow-lg dark:bg-gray-100"
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.8}
      testID={testID}
    >
      {children}
    </TouchableOpacity>
  );
}

export function NoteDetailFab({
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

  return (
    <View className="absolute right-6" style={{ bottom }}>
      <FabButton
        onPress={onSettingsToggle}
        label={t("detail.settings")}
        testID={mobileTestIds.notes.settingsButton}
      >
        <Settings size={ICON_SIZE} color={iconColor} />
      </FabButton>
    </View>
  );
}
