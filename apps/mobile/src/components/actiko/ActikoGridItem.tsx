import type { ActivityDaySummary } from "@packages/frontend-shared/hooks/activityDaySummary";
import { Platform, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ActivityCard } from "./ActivityCard";
import type { Activity } from "./useActikoPage";

export function ActikoGridItem({
  activity,
  index,
  reduceMotion,
  summary,
  iconBlob,
  onPress,
  onEdit,
}: {
  activity: Activity;
  index: number;
  reduceMotion: boolean;
  summary: ActivityDaySummary | undefined;
  iconBlob:
    | { activityId: string; base64: string; mimeType: string }
    | undefined;
  onPress: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
}) {
  const card = (
    <ActivityCard
      activity={activity}
      summary={summary}
      iconBlob={iconBlob}
      onPress={() => onPress(activity)}
      onEdit={() => onEdit(activity)}
    />
  );

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
