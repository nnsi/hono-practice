import { useState } from "react";

import { ActivityIndicator, Image, Text, View } from "react-native";

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
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

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

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const iconUrl = activity.iconThumbnailUrl || activity.iconUrl;
  const showImage = activity.iconType === "upload" && iconUrl && !imageError;

  if (showImage) {
    return (
      <View className={`${sizeClass} ${className}`}>
        {imageLoading && (
          <View
            className={`${sizeClass} absolute z-10 bg-gray-100 rounded items-center justify-center`}
          >
            <ActivityIndicator size="small" color="#4b5563" />
          </View>
        )}
        <Image
          source={{ uri: iconUrl }}
          className={`${sizeClass} rounded`}
          resizeMode="cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </View>
    );
  }

  return (
    <Text className={`${textSize} ${className}`}>{activity.emoji || "📝"}</Text>
  );
}
