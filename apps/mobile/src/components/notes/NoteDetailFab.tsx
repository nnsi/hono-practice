import { Eye, Pencil, Settings } from "lucide-react-native";
import { TouchableOpacity, View } from "react-native";

import type { NoteDetailMode } from "./useNoteDetailPage";

type NoteDetailFabProps = {
  mode: NoteDetailMode;
  onEditPress: () => void;
  onPreviewToggle: () => void;
  onSettingsToggle: () => void;
  bottomInset?: number;
};

const ICON_COLOR_LIGHT = "#f9fafb";
const ICON_SIZE = 22;

function FabButton({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      className="bg-gray-900 dark:bg-gray-100 rounded-full shadow-lg p-3.5 items-center justify-center"
      onPress={onPress}
      accessibilityRole="button"
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
  const bottom = 24 + bottomInset;

  if (mode === "view") {
    return (
      <View className="absolute right-6" style={{ bottom }}>
        <FabButton onPress={onEditPress}>
          <Pencil size={ICON_SIZE} color={ICON_COLOR_LIGHT} />
        </FabButton>
      </View>
    );
  }

  if (mode === "edit") {
    return (
      <View className="absolute right-6 gap-3" style={{ bottom }}>
        <FabButton onPress={onSettingsToggle}>
          <Settings size={ICON_SIZE} color={ICON_COLOR_LIGHT} />
        </FabButton>
        <FabButton onPress={onPreviewToggle}>
          <Eye size={ICON_SIZE} color={ICON_COLOR_LIGHT} />
        </FabButton>
      </View>
    );
  }

  // mode === "preview"
  return (
    <View className="absolute right-6 gap-3" style={{ bottom }}>
      <FabButton onPress={onSettingsToggle}>
        <Settings size={ICON_SIZE} color={ICON_COLOR_LIGHT} />
      </FabButton>
      <FabButton onPress={onPreviewToggle}>
        <Pencil size={ICON_SIZE} color={ICON_COLOR_LIGHT} />
      </FabButton>
    </View>
  );
}
