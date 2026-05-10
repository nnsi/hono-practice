import { useTranslation } from "@packages/i18n";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import { mobileTestIds } from "../../testing/testIds";

type FilterActivity = {
  id: string;
  name: string;
};

const CHIP_BASE = "px-3 py-1.5 rounded-full mr-2";
const CHIP_SELECTED = "bg-gray-900 dark:bg-gray-100";
const CHIP_UNSELECTED = "bg-gray-100 dark:bg-gray-700";
const TEXT_SELECTED = "text-white dark:text-gray-900 text-xs font-medium";
const TEXT_UNSELECTED = "text-gray-700 dark:text-gray-300 text-xs font-medium";

// iOSではcolumn-flex親内のhorizontal ScrollViewが高さ未指定だと縦に伸びることがあるため、
// 親Viewで高さを固定する。
const FILTER_BAR_HEIGHT = 44;

export function NotesActivityFilter({
  activities,
  selectedActivityId,
  onSelect,
}: {
  activities: FilterActivity[];
  selectedActivityId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useTranslation("note");

  return (
    <View
      style={{ height: FILTER_BAR_HEIGHT }}
      className="border-b border-gray-100 dark:border-gray-800"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => onSelect(null)}
          className={`${CHIP_BASE} ${selectedActivityId === null ? CHIP_SELECTED : CHIP_UNSELECTED}`}
          accessibilityRole="button"
          testID={mobileTestIds.notes.filterAll}
        >
          <Text
            className={
              selectedActivityId === null ? TEXT_SELECTED : TEXT_UNSELECTED
            }
          >
            {t("list.filter.all")}
          </Text>
        </TouchableOpacity>
        {activities.map((activity) => {
          const isSelected = selectedActivityId === activity.id;
          return (
            <TouchableOpacity
              key={activity.id}
              onPress={() => onSelect(activity.id)}
              className={`${CHIP_BASE} ${isSelected ? CHIP_SELECTED : CHIP_UNSELECTED}`}
              accessibilityRole="button"
              testID={mobileTestIds.notes.filterActivity(activity.id)}
            >
              <Text className={isSelected ? TEXT_SELECTED : TEXT_UNSELECTED}>
                {activity.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
