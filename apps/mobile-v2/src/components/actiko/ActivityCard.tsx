import { useState } from "react";
import { View, TouchableOpacity, Text, Image } from "react-native";
import { Pencil } from "lucide-react-native";

type IconBlob = {
  activityId: string;
  base64: string;
  mimeType: string;
};

type ActivityCardProps = {
  activity: {
    id: string;
    name: string;
    emoji: string;
    quantityUnit: string;
    iconType?: "emoji" | "upload" | "generate";
    iconUrl?: string | null;
    iconThumbnailUrl?: string | null;
  };
  isDone: boolean;
  iconBlob?: IconBlob;
  onPress: () => void;
  onEdit: () => void;
};

const warmShadow = {
  shadowColor: "#1c1917",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
};

const doneBg = { backgroundColor: "#f0fdfa" };

export function ActivityCard({
  activity,
  isDone,
  iconBlob,
  onPress,
  onEdit,
}: ActivityCardProps) {
  const [imageError, setImageError] = useState(false);

  const renderIcon = () => {
    if (activity.iconType === "upload" && !imageError) {
      if (iconBlob) {
        return (
          <Image
            source={{
              uri: `data:${iconBlob.mimeType};base64,${iconBlob.base64}`,
            }}
            style={{ width: 32, height: 32, borderRadius: 8 }}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        );
      }
      const remoteUrl = activity.iconThumbnailUrl || activity.iconUrl;
      if (remoteUrl) {
        return (
          <Image
            source={{ uri: remoteUrl }}
            style={{ width: 32, height: 32, borderRadius: 8 }}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        );
      }
    }
    return <Text className="text-3xl">{activity.emoji || "\ud83d\udcdd"}</Text>;
  };

  return (
    <View className="flex-1 m-1 relative">
      <TouchableOpacity
        className={`p-4 rounded-2xl border items-center min-h-[120px] ${
          isDone ? "border-emerald-200" : "border-gray-200"
        }`}
        style={[warmShadow, isDone ? doneBg : { backgroundColor: "#ffffff" }]}
        onPress={onPress}
        activeOpacity={0.95}
      >
        <View className="mb-2">{renderIcon()}</View>
        <Text
          className="text-sm font-medium text-gray-800 text-center"
          numberOfLines={1}
        >
          {activity.name}
        </Text>
        {activity.quantityUnit ? (
          <Text className="text-xs text-gray-400 mt-1">
            {activity.quantityUnit}
          </Text>
        ) : null}
      </TouchableOpacity>
      {/* Edit button */}
      <TouchableOpacity
        className="absolute top-1.5 right-1.5 p-2 rounded-full bg-white/80"
        onPress={onEdit}
        activeOpacity={0.7}
      >
        <Pencil size={12} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
}
