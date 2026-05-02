import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@packages/i18n";
import { useRouter } from "expo-router";
import { Globe, LogOut, Menu, Settings } from "lucide-react-native";
import {
  Animated,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthContext } from "../../../app/_layout";
import { useThemeContext } from "../../contexts/ThemeContext";
import { mobileTestIds } from "../../testing/testIds";
import { useTabPreference } from "../setting/tabPreferenceStore";
import { HamburgerMenuItem } from "./HamburgerMenuItem";
import { MOBILE_TAB_METADATA } from "./tabMetadata";

export function HamburgerMenu() {
  const { t, i18n } = useTranslation(["common", "settings"]);
  const { logout } = useAuthContext();
  const { colors } = useThemeContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preference } = useTabPreference();
  const [open, setOpen] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const hiddenTabs = Object.values(MOBILE_TAB_METADATA).filter(
    (tab) => !preference.tabs.includes(tab.key),
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: open ? 1 : 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: open ? 1 : 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, opacity, scale]);

  const close = useCallback(() => setOpen(false), []);

  const switchLanguage = useCallback(() => {
    const next = i18n.language === "ja" ? "en" : "ja";
    i18n.changeLanguage(next);
    close();
  }, [i18n, close]);

  const goToTab = useCallback(
    (routeName: string) => {
      close();
      router.push(routeName === "index" ? "/(tabs)" : `/(tabs)/${routeName}`);
    },
    [router, close],
  );

  const goToSettings = useCallback(() => {
    close();
    router.push("/(tabs)/settings");
  }, [router, close]);

  const handleLogout = useCallback(async () => {
    close();
    await logout();
  }, [logout, close]);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t("common:menu")}
        testID={mobileTestIds.menu.button}
        style={[
          styles.menuButton,
          {
            top: insets.top,
            backgroundColor: open ? colors.surfaceSecondary : "transparent",
          },
        ]}
      >
        <Menu size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {open && (
        <>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityRole="none"
          />
          <Animated.View
            accessibilityRole="menu"
            style={[
              styles.dropdown,
              {
                top: insets.top + 44,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.shadowColor,
                opacity,
                transform: [{ scale }],
              },
            ]}
          >
            <HamburgerMenuItem
              icon={<Globe size={16} color={colors.textMuted} />}
              label={i18n.language === "ja" ? "English" : "日本語"}
              onPress={switchLanguage}
              textColor={colors.text}
            />
            {hiddenTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <HamburgerMenuItem
                  key={tab.key}
                  icon={<Icon size={16} color={colors.textMuted} />}
                  label={tab.label}
                  onPress={() => goToTab(tab.routeName)}
                  textColor={colors.text}
                />
              );
            })}
            <HamburgerMenuItem
              icon={<Settings size={16} color={colors.textMuted} />}
              label={t("settings:heading")}
              onPress={goToSettings}
              textColor={colors.text}
              testID={mobileTestIds.menu.settingsItem}
            />
            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />
            <HamburgerMenuItem
              icon={<LogOut size={16} color="#ef4444" />}
              label={t("settings:logout")}
              onPress={handleLogout}
              textColor="#ef4444"
            />
          </Animated.View>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    position: "absolute",
    right: 12,
    zIndex: 50,
    padding: 8,
    borderRadius: 12,
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdown: {
    position: "absolute",
    right: 12,
    zIndex: 51,
    width: 192,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
});
