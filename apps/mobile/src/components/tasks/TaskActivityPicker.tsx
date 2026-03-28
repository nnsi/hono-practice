import { useTranslation } from "@packages/i18n";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { ActivityIcon } from "../common/ActivityIcon";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  iconType?: "emoji" | "upload" | "generate";
  iconUrl?: string | null;
  iconThumbnailUrl?: string | null;
};

type Kind = {
  id: string;
  name: string;
  deletedAt?: string | null;
};

type IconBlob = { base64: string; mimeType: string };

type TaskActivityPickerProps = {
  activities: Activity[];
  iconBlobMap: Map<string, IconBlob>;
  activityId: string | null;
  onActivityIdChange: (id: string | null) => void;
  kinds: Kind[];
  activityKindId: string | null;
  onActivityKindIdChange: (id: string | null) => void;
  disabled?: boolean;
};

export function TaskActivityPicker({
  activities,
  iconBlobMap,
  activityId,
  onActivityIdChange,
  kinds,
  activityKindId,
  onActivityKindIdChange,
  disabled = false,
}: TaskActivityPickerProps) {
  const { t } = useTranslation("task");
  const activeKinds = kinds.filter((k) => !k.deletedAt);

  return (
    <>
      {activities.length > 0 && (
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("create.label.activity")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row"
          >
            <View className="flex-row gap-2">
              <PillButton
                label={t("create.none")}
                selected={activityId === null}
                disabled={disabled}
                onPress={() => onActivityIdChange(null)}
              />
              {activities.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() =>
                    !disabled &&
                    onActivityIdChange(activityId === a.id ? null : a.id)
                  }
                  disabled={disabled}
                  className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border ${
                    activityId === a.id
                      ? "bg-gray-900 border-gray-900"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  } ${disabled ? "opacity-50" : ""}`}
                >
                  <ActivityIcon
                    iconType={a.iconType}
                    emoji={a.emoji || "\u{1f4dd}"}
                    iconBlob={iconBlobMap.get(a.id)}
                    iconUrl={a.iconUrl}
                    iconThumbnailUrl={a.iconThumbnailUrl}
                    size={14}
                    fontSize="text-xs"
                  />
                  <Text
                    className={`text-sm ${
                      activityId === a.id
                        ? "text-white font-medium"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {activityId && activeKinds.length > 0 && (
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("create.label.kind")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row"
          >
            <View className="flex-row gap-2">
              <PillButton
                label={t("create.none")}
                selected={activityKindId === null}
                disabled={disabled}
                onPress={() => onActivityKindIdChange(null)}
              />
              {activeKinds.map((k) => (
                <PillButton
                  key={k.id}
                  label={k.name}
                  selected={activityKindId === k.id}
                  disabled={disabled}
                  onPress={() =>
                    onActivityKindIdChange(
                      activityKindId === k.id ? null : k.id,
                    )
                  }
                />
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </>
  );
}

function PillButton({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => !disabled && onPress()}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-full border ${
        selected ? "bg-gray-900 border-gray-900" : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <Text
        className={`text-sm ${
          selected ? "text-white font-medium" : "text-gray-700 dark:text-gray-300"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
