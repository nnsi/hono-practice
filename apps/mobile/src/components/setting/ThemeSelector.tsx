import { useTranslation } from "@packages/i18n";
import { Monitor, Moon, Sun } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeContext } from "../../contexts/ThemeContext";
import type { ThemePreference } from "../../hooks/useTheme";

const options: {
  value: ThemePreference;
  icon: typeof Sun;
  labelKey: "themeLight" | "themeDark" | "themeSystem";
}[] = [
  { value: "light", icon: Sun, labelKey: "themeLight" },
  { value: "dark", icon: Moon, labelKey: "themeDark" },
  { value: "system", icon: Monitor, labelKey: "themeSystem" },
];

export function ThemeSelector() {
  const { preference, colors, setTheme } = useThemeContext();
  const { t } = useTranslation("settings");

  return (
    <View className="px-4 py-3">
      <Text className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        {t("theme")}
      </Text>
      <View className="flex-row gap-2">
        {options.map(({ value, icon: Icon, labelKey }) => {
          const active = preference === value;
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setTheme(value)}
              activeOpacity={0.7}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${
                active
                  ? "bg-amber-50 dark:bg-amber-900/30"
                  : "bg-gray-50 dark:bg-gray-800"
              }`}
            >
              <Icon
                size={16}
                color={active ? colors.amber : colors.textMuted}
              />
              <Text
                className={`text-sm font-medium ${
                  active
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
