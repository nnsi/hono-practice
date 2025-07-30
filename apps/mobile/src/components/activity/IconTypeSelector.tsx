import { useState } from "react";

import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

type IconType = "emoji" | "upload" | "generate";

interface IconTypeSelectorProps {
  value: {
    type: IconType;
    emoji?: string;
    file?: { uri: string };
    preview?: string;
  };
  onChange: (value: {
    type: IconType;
    emoji?: string;
    file?: { uri: string };
    preview?: string;
  }) => void;
  disabled?: boolean;
}

export function IconTypeSelector({
  value,
  onChange,
  disabled = false,
}: IconTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<IconType>(
    value.type || "emoji",
  );

  const handleTypeChange = (newType: IconType) => {
    setSelectedType(newType);
    onChange({
      type: newType,
      emoji: newType === "emoji" ? value.emoji : undefined,
      file: newType === "upload" ? value.file : undefined,
      preview: newType === "upload" ? value.preview : undefined,
    });
  };

  const handleEmojiChange = (emoji: string) => {
    onChange({
      type: "emoji",
      emoji,
      file: undefined,
      preview: undefined,
    });
  };

  const handleImagePicker = async () => {
    // 画像選択の権限をリクエスト
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("画像を選択するには、カメラロールへのアクセス許可が必要です。");
      return;
    }

    // 画像を選択
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onChange({
        type: "upload",
        emoji: undefined,
        file: { uri: asset.uri },
        preview: asset.uri,
      });
    }
  };

  // 開発環境用のテスト画像生成（React Native版）
  const handleTestImageUpload = async () => {
    if (__DEV__) {
      // React Nativeではcanvasが使えないため、デフォルトのテスト画像URLを使用
      const testImageUri =
        "https://via.placeholder.com/256/667eea/ffffff?text=A";
      onChange({
        type: "upload",
        emoji: undefined,
        file: { uri: testImageUri },
        preview: testImageUri,
      });
    }
  };

  return (
    <View className="space-y-4">
      {/* ラジオボタンの代わりにセグメントコントロール風のUI */}
      <View className="flex-row bg-gray-100 rounded-lg p-1">
        <TouchableOpacity
          className={`flex-1 py-2 rounded-md ${
            selectedType === "emoji" ? "bg-white" : ""
          }`}
          onPress={() => handleTypeChange("emoji")}
          disabled={disabled}
        >
          <Text
            className={`text-center ${
              selectedType === "emoji" ? "font-semibold" : ""
            }`}
          >
            絵文字
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 rounded-md ${
            selectedType === "upload" ? "bg-white" : ""
          }`}
          onPress={() => handleTypeChange("upload")}
          disabled={disabled}
        >
          <Text
            className={`text-center ${
              selectedType === "upload" ? "font-semibold" : ""
            }`}
          >
            画像
          </Text>
        </TouchableOpacity>
      </View>

      <View className="min-h-[50px]">
        {selectedType === "emoji" && (
          <View>
            <TextInput
              value={value.emoji || ""}
              onChangeText={handleEmojiChange}
              placeholder="絵文字を入力"
              className="bg-gray-100 p-3 rounded-lg text-2xl text-center w-24"
              editable={!disabled}
              maxLength={2}
            />
            <Text className="text-xs text-gray-500 mt-1">
              絵文字を直接入力してください
            </Text>
          </View>
        )}

        {selectedType === "upload" && (
          <View className="space-y-2">
            <View className="flex-row items-center gap-4">
              <TouchableOpacity
                className="bg-gray-100 px-4 py-3 rounded-lg flex-row items-center"
                onPress={handleImagePicker}
                disabled={disabled}
              >
                <Ionicons name="image-outline" size={20} color="#6b7280" />
                <Text className="text-gray-700 ml-2">画像を選択</Text>
              </TouchableOpacity>

              {__DEV__ && (
                <TouchableOpacity
                  className="bg-gray-100 px-4 py-3 rounded-lg flex-row items-center"
                  onPress={handleTestImageUpload}
                  disabled={disabled}
                >
                  <Ionicons name="flask-outline" size={20} color="#6b7280" />
                  <Text className="text-gray-700 ml-2">テスト</Text>
                </TouchableOpacity>
              )}

              {value.preview && (
                <Image
                  source={{ uri: value.preview }}
                  className="w-12 h-12 rounded"
                />
              )}
            </View>

            {value.file && (
              <Text className="text-sm text-gray-600">
                画像が選択されています
              </Text>
            )}

            <Text className="text-xs text-gray-500">
              対応形式: JPG, PNG, GIF, WebP (最大5MB)
            </Text>
          </View>
        )}

        {selectedType === "generate" && (
          <View>
            <Text className="text-sm text-gray-500">
              AI生成機能は近日公開予定です
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
