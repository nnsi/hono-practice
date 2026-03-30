import type { ApiKeyScope } from "@packages/domain/apiKey/apiKeySchema";
import { useTranslation } from "@packages/i18n";
import { Check } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

const GRANULAR_SCOPES = [
  { scope: "activity-logs:read", labelKey: "apiKeyScopeActivityLogsRead" },
  { scope: "activity-logs:write", labelKey: "apiKeyScopeActivityLogsWrite" },
  { scope: "tasks:read", labelKey: "apiKeyScopeTasksRead" },
  { scope: "tasks:write", labelKey: "apiKeyScopeTasksWrite" },
  { scope: "voice", labelKey: "apiKeyScopeVoice" },
] as const satisfies readonly { scope: ApiKeyScope; labelKey: string }[];

export function MobileScopeSelector({
  selectedScopes,
  onChange,
}: {
  selectedScopes: ApiKeyScope[];
  onChange: (scopes: ApiKeyScope[]) => void;
}) {
  const { t } = useTranslation("settings");
  const isAll = selectedScopes.includes("all");

  const handleToggle = (scope: ApiKeyScope) => {
    if (scope === "all") {
      onChange(isAll ? [] : ["all"]);
      return;
    }
    if (isAll) return;

    const next = selectedScopes.includes(scope)
      ? selectedScopes.filter((s) => s !== scope)
      : [...selectedScopes, scope];
    onChange(next);
  };

  return (
    <View>
      <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        {t("apiKeyScopes")}
      </Text>

      <ScopeCheckbox
        label={t("apiKeyScopeAll")}
        checked={isAll}
        onPress={() => handleToggle("all")}
        bold
      />

      <View className="border-t border-gray-100 dark:border-gray-800 my-1" />

      {GRANULAR_SCOPES.map(({ scope, labelKey }) => (
        <ScopeCheckbox
          key={scope}
          label={t(labelKey)}
          checked={isAll || selectedScopes.includes(scope)}
          disabled={isAll}
          onPress={() => handleToggle(scope)}
        />
      ))}
    </View>
  );
}

function ScopeCheckbox({
  label,
  checked,
  disabled,
  onPress,
  bold,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
  bold?: boolean;
}) {
  return (
    <TouchableOpacity
      className={`flex-row items-center gap-2 py-1.5 ${disabled ? "opacity-40" : ""}`}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View
        className={`w-5 h-5 rounded border items-center justify-center ${
          checked
            ? "bg-stone-900 border-stone-900"
            : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
        }`}
      >
        {checked && <Check size={14} color="#fff" />}
      </View>
      <Text
        className={`text-sm text-gray-900 dark:text-gray-100 ${bold ? "font-medium" : ""}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
