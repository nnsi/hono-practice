import { Image, Text, View } from "react-native";

import type { GetActivityResponse } from "@dtos/response";

interface ActivityIconProps {
  activity: GetActivityResponse;
  size?: "small" | "medium" | "large" | "xlarge";
  className?: string;
}

export function ActivityIcon({
  activity,
  size = "medium",
  className = "",
}: ActivityIconProps) {
  const sizeClasses = {
    small: "w-6 h-6",
    medium: "w-8 h-8",
    large: "w-12 h-12",
    xlarge: "w-16 h-16",
  };

  const textSizes = {
    small: "text-base",
    medium: "text-2xl",
    large: "text-4xl",
    xlarge: "text-6xl",
  };

  const sizeClass = sizeClasses[size];
  const textSize = textSizes[size];

  if (activity.iconType === "upload" && activity.iconUrl) {
    return (
      <View className={`${sizeClass} ${className}`}>
        <Image
          source={{ uri: activity.iconUrl }}
          className={`${sizeClass} rounded`}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <Text className={`${textSize} ${className}`}>{activity.emoji || "📝"}</Text>
  );
}
