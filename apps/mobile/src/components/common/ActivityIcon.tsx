import { useState } from "react";

import { Image, Text } from "react-native";

type IconBlob = {
  base64: string;
  mimeType: string;
};

export function ActivityIcon({
  iconType,
  emoji,
  iconBlob,
  iconUrl,
  iconThumbnailUrl,
  size = 32,
  fontSize,
}: {
  iconType?: "emoji" | "upload" | "generate";
  emoji: string;
  iconBlob?: IconBlob;
  iconUrl?: string | null;
  iconThumbnailUrl?: string | null;
  size?: number;
  fontSize?: string;
}) {
  const [imageError, setImageError] = useState(false);

  if (iconType === "upload" && !imageError) {
    if (iconBlob) {
      return (
        <Image
          source={{
            uri: `data:${iconBlob.mimeType};base64,${iconBlob.base64}`,
          }}
          style={{ width: size, height: size, borderRadius: size / 4 }}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      );
    }
    const remoteUrl = iconThumbnailUrl || iconUrl;
    if (remoteUrl) {
      return (
        <Image
          source={{ uri: remoteUrl }}
          style={{ width: size, height: size, borderRadius: size / 4 }}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      );
    }
  }

  return <Text className={fontSize ?? "text-2xl"}>{emoji || "\u{1f4dd}"}</Text>;
}
