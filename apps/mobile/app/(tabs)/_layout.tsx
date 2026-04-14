import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HamburgerMenu } from "../../src/components/common/HamburgerMenu";
import { MOBILE_TAB_METADATA } from "../../src/components/common/tabMetadata";
import {
  useTabPreference,
  useTabPreferenceSync,
} from "../../src/components/setting/tabPreferenceStore";
import { useThemeContext } from "../../src/contexts/ThemeContext";
import { useNavigationSync } from "../../src/hooks/useNavigationSync";
import { mobileTestIds } from "../../src/testing/testIds";
import { useAuthContext } from "../_layout";

const TAB_TEST_IDS: Record<keyof typeof MOBILE_TAB_METADATA, string> = {
  home: mobileTestIds.tabs.home,
  daily: mobileTestIds.tabs.daily,
  stats: mobileTestIds.tabs.stats,
  goals: mobileTestIds.tabs.goals,
  tasks: mobileTestIds.tabs.tasks,
  notes: mobileTestIds.tabs.notes,
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useThemeContext();
  const { preference } = useTabPreference();
  const visibleTabs = preference.tabs.map((key) => MOBILE_TAB_METADATA[key]);
  const activeRouteName = state.routes[state.index]?.name;
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.tabBorder,
        backgroundColor: colors.tabBg,
        ...(Platform.OS === "web"
          ? ({
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
            } as Record<string, string>)
          : {}),
      }}
    >
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          paddingTop: 8,
          paddingBottom: 10 + insets.bottom,
          maxWidth: 768,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {visibleTabs.map((tab) => {
          const isActive = activeRouteName === tab.routeName;
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => navigation.navigate(tab.routeName)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
              testID={TAB_TEST_IDS[tab.key]}
              style={{
                alignItems: "center",
                gap: 2,
                paddingHorizontal: 12,
                paddingVertical: 4,
                minHeight: 48,
              }}
            >
              <Icon
                size={24}
                color={isActive ? colors.tabActive : colors.tabInactive}
              />
              <Text
                style={{
                  fontSize: 12,
                  letterSpacing: 0.5,
                  color: isActive ? colors.tabActive : colors.tabInactive,
                  fontWeight: isActive ? "600" : "500",
                }}
              >
                {tab.label}
              </Text>
              {/* Active indicator pill */}
              <View
                style={{
                  width: 16,
                  height: 2.5,
                  borderRadius: 9999,
                  backgroundColor: isActive ? colors.tabPill : "transparent",
                  marginTop: 1,
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { syncReady, userId } = useAuthContext();
  const { colors } = useThemeContext();
  useNavigationSync(syncReady, userId);
  useTabPreferenceSync();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            paddingTop: insets.top,
            maxWidth: 768,
            width: "100%",
            alignSelf: "center",
            backgroundColor: colors.sceneBg,
          },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Actiko" }} />
        <Tabs.Screen name="daily" options={{ title: "Daily" }} />
        <Tabs.Screen name="stats" options={{ title: "Stats" }} />
        <Tabs.Screen name="goals" options={{ title: "Goal" }} />
        <Tabs.Screen name="tasks" options={{ title: "Tasks" }} />
        <Tabs.Screen name="notes" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="contact" options={{ href: null }} />
      </Tabs>
      <HamburgerMenu />
    </View>
  );
}
