import { ImageOff, ImagePlus } from "lucide-react-native";
import { Image, Text, TouchableOpacity, View } from "react-native";

type ActivityIconPickerProps = {
  iconType: "emoji" | "upload" | "generate";
  blob: { base64: string; mimeType: string } | null;
  isProcessing: boolean;
  onPickImage: () => void;
  onClearImage: () => void;
};

export function ActivityIconPicker({
  iconType,
  blob,
  isProcessing,
  onPickImage,
  onClearImage,
}: ActivityIconPickerProps) {
  return (
    <View className="flex-row gap-2">
      <TouchableOpacity
        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg border border-gray-300 ${
          isProcessing ? "opacity-50" : ""
        }`}
        onPress={onPickImage}
        disabled={isProcessing}
      >
        {blob ? (
          <>
            <Image
              source={{
                uri: `data:${blob.mimeType};base64,${blob.base64}`,
              }}
              style={{ width: 24, height: 24, borderRadius: 4 }}
              resizeMode="cover"
            />
            <Text className="ml-1.5 text-sm text-gray-700">
              {isProcessing ? "処理中..." : "画像を変更"}
            </Text>
          </>
        ) : (
          <>
            <ImagePlus size={16} color="#6b7280" />
            <Text className="ml-1.5 text-sm text-gray-700">
              {isProcessing ? "処理中..." : "画像を選択"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {iconType === "upload" ? (
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center py-2.5 rounded-lg border border-red-300"
          onPress={onClearImage}
        >
          <ImageOff size={16} color="#ef4444" />
          <Text className="ml-1.5 text-sm text-red-500">画像を削除</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
