import { useEffect, useMemo } from "react";

import type { TabKey } from "@packages/domain/user/tabPreferenceSchema";
import { useTranslation } from "@packages/i18n";
import { GripVertical, LayoutGrid } from "lucide-react-native";
import { PanResponder, Text, View } from "react-native";

import { useThemeContext } from "../../contexts/ThemeContext";
import { MOBILE_TAB_METADATA } from "../common/tabMetadata";
import { Section, type ShadowStyle } from "./SettingsParts";
import { TabCustomizationActionButton } from "./TabCustomizationActionButton";
import { useTabCustomization } from "./useTabCustomization";

function TabCustomizationDragHandle({
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

export function TabCustomizationSection({
  shadow,
  onDragStateChange,
}: {
  shadow: ShadowStyle;
  onDragStateChange?: (isDragging: boolean) => void;
}) {
  const { t } = useTranslation("settings");
  const { colors } = useThemeContext();
  const {
    preference,
    visibleTabs,
    hiddenKeys,
    draggingKey,
    showMaxWarning,
    fixedTabKey,
    hideTab,
    showTab,
    startDrag,
    updateDrag,
    finishDrag,
  } = useTabCustomization();

  useEffect(() => {
    onDragStateChange?.(draggingKey !== null);
    return () => {
      onDragStateChange?.(false);
    };
  }, [draggingKey, onDragStateChange]);

  return (
    <Section icon={LayoutGrid} label={t("tabCustomization")} shadow={shadow}>
      <View className="px-4 py-3">
        <Text className="text-sm text-gray-600 dark:text-gray-300">
          {t("tabCustomizationDesc")}
        </Text>
        <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {t("tabCustomizationHint")}
        </Text>
        {preference.syncStatus === "pending" && (
          <View className="mt-2 self-start rounded-full bg-amber-100 px-2 py-1 dark:bg-amber-900/30">
            <Text className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
              {t("tabSyncPending")}
            </Text>
          </View>
        )}
        {showMaxWarning && (
          <View className="mt-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
            <Text className="text-xs text-amber-700 dark:text-amber-300">
              {t("tabMaxReached")}
            </Text>
          </View>
        )}
      </View>

      <View className="gap-2 px-4 pb-4">
        {visibleTabs.map((key, index) => {
          const tab = MOBILE_TAB_METADATA[key];
          const Icon = tab.icon;
          const isFixed = key === fixedTabKey;
          const isDragging = draggingKey === key;

          return (
            <View
              key={key}
              className={`flex-row items-center gap-3 rounded-xl border px-3 py-3 ${
                isDragging
                  ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                  : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
              }`}
            >
              <TabCustomizationDragHandle
                index={index}
                isFixed={isFixed}
                isDragging={isDragging}
                tabKey={key}
                startDrag={startDrag}
                updateDrag={updateDrag}
                finishDrag={finishDrag}
              />
              <Icon size={18} color={colors.textMuted} />
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {tab.label}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {isFixed ? t("tabFixed") : t("tabVisible")}
                </Text>
              </View>
              {!isFixed && (
                <TabCustomizationActionButton
                  label={t("tabHide")}
                  onPress={() => hideTab(key)}
                />
              )}
            </View>
          );
        })}

        {hiddenKeys.map((key) => {
          const tab = MOBILE_TAB_METADATA[key];
          const Icon = tab.icon;
          return (
            <View
              key={key}
              className="flex-row items-center gap-3 rounded-xl border border-dashed border-gray-200 px-3 py-3 dark:border-gray-700"
            >
              <Icon size={18} color={colors.textMuted} />
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {tab.label}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {t("tabHidden")}
                </Text>
              </View>
              <TabCustomizationActionButton
                label={t("tabShow")}
                onPress={() => showTab(key)}
              />
            </View>
          );
        })}
      </View>
    </Section>
  );
}
