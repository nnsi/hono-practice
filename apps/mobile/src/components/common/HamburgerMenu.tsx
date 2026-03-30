import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@packages/i18n";
import { useRouter } from "expo-router";
import { Globe, LogOut, Menu, Settings } from "lucide-react-native";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthContext } from "../../../app/_layout";
import { useThemeContext } from "../../contexts/ThemeContext";

export function HamburgerMenu() {
  const { t, i18n } = useTranslation(["common", "settings"]);
  const { logout } = useAuthContext();
  const { colors } = useThemeContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;

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
            <MenuItem
              icon={<Globe size={16} color={colors.textMuted} />}
              label={i18n.language === "ja" ? "English" : "日本語"}
              onPress={switchLanguage}
              textColor={colors.text}
            />
            <MenuItem
              icon={<Settings size={16} color={colors.textMuted} />}
              label={t("settings:heading")}
              onPress={goToSettings}
              textColor={colors.text}
            />
            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />
            <MenuItem
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

function MenuItem({
  icon,
  label,
  onPress,
  textColor,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  textColor: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      style={styles.menuItem}
    >
      {icon}
      <Text style={[styles.menuItemText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
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
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  menuItemText: {
    fontSize: 14,
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
});
