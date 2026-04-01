import type { LucideIcon } from "lucide-react-native";
import { Platform, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ActionCard } from "./ActionCard";
import { ActivityCard } from "./ActivityCard";
import type { Activity } from "./useActikoPage";

type ActionItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
};

// biome-ignore lint/suspicious/noExplicitAny: grid items are heterogeneous (activities + action placeholders + spacers)
type GridItem = { id: string; [key: string]: any };

export function ActikoGridItem({
  item,
  index,
  reduceMotion,
  iconBlobMap,
  hasLogsForActivity,
  onActivityPress,
  onActivityEdit,
  actions,
}: {
  item: GridItem;
  index: number;
  reduceMotion: boolean;
  iconBlobMap: Map<
    string,
    { activityId: string; base64: string; mimeType: string }
  >;
  hasLogsForActivity: (id: string) => boolean;
  onActivityPress: (activity: Activity) => void;
  onActivityEdit: (activity: Activity) => void;
  actions: ActionItem[];
}) {
  if (item.id.startsWith("__spacer_")) {
    return <View style={{ flex: 1 }} />;
  }

  const action = actions.find((a) => a.id === item.id);
  let card: React.ReactNode;

  if (action) {
    card = (
      <ActionCard
        icon={action.icon}
        label={action.label}
        onPress={action.onPress}
      />
    );
  } else {
    const activity = item as Activity;
    card = (
      <ActivityCard
        activity={activity}
        isDone={hasLogsForActivity(activity.id)}
        iconBlob={iconBlobMap.get(activity.id)}
        onPress={() => onActivityPress(activity)}
        onEdit={() => onActivityEdit(activity)}
      />
    );
  }

  if (Platform.OS === "web" || reduceMotion) {
    return <View style={{ flex: 1 }}>{card}</View>;
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 35)
        .duration(350)
        .springify()}
      style={{ flex: 1 }}
    >
      {card}
    </Animated.View>
  );
}
