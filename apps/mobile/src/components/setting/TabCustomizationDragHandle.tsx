import { useMemo } from "react";

import type { TabKey } from "@packages/domain/user/tabPreferenceSchema";
import { GripVertical } from "lucide-react-native";
import { PanResponder, View } from "react-native";

import { useThemeContext } from "../../contexts/ThemeContext";

export function TabCustomizationDragHandle({
  index,
  isFixed,
  isDragging,
  tabKey,
  startDrag,
  updateDrag,
  finishDrag,
}: {
  index: number;
  isFixed: boolean;
  isDragging: boolean;
  tabKey: TabKey;
  startDrag: (key: TabKey, index: number, pageY: number) => void;
  updateDrag: (pageY: number) => void;
  finishDrag: () => void;
}) {
  const { colors } = useThemeContext();
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isFixed,
        onStartShouldSetPanResponderCapture: () => !isFixed,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !isFixed && Math.abs(gestureState.dy) > 2,
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          !isFixed && Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: (_, gestureState) => {
          startDrag(tabKey, index, gestureState.y0);
        },
        onPanResponderMove: (_, gestureState) => {
          updateDrag(gestureState.moveY);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: finishDrag,
        onPanResponderTerminate: finishDrag,
        onShouldBlockNativeResponder: () => true,
      }),
    [finishDrag, index, isFixed, startDrag, tabKey, updateDrag],
  );

  return (
    <View
      {...panResponder.panHandlers}
      className={`rounded-lg p-2 ${isDragging ? "bg-blue-100 dark:bg-blue-900/30" : ""}`}
      accessibilityRole={isFixed ? undefined : "button"}
      accessibilityLabel={isFixed ? undefined : "Drag to reorder tab"}
    >
      <GripVertical
        size={16}
        color={isFixed ? colors.border : colors.textMuted}
      />
    </View>
  );
}
