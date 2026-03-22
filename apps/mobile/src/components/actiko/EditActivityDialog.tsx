import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import { Switch, Text, TouchableOpacity, View } from "react-native";

import { EmojiPicker } from "../common/EmojiPicker";
import { IMESafeTextInput } from "../common/IMESafeTextInput";
import { ModalOverlay } from "../common/ModalOverlay";
import { ActivityIconPicker } from "./ActivityIconPicker";
import { KindColorPicker } from "./KindColorPicker";
import { RecordingModeSelector } from "./RecordingModeSelector";
import { useEditActivityDialog } from "./useEditActivityDialog";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  iconType: "emoji" | "upload" | "generate";
  quantityUnit: string;
  showCombinedStats: boolean;
  recordingMode?: RecordingMode;
  recordingModeConfig?: string | null;
};

type EditActivityDialogProps = {
  visible: boolean;
  onClose: () => void;
  activity: Activity | null;
  onUpdated: () => void;
};

export function EditActivityDialog({
  visible,
  onClose,
  activity,
  onUpdated,
}: EditActivityDialogProps) {
  const {
    name,
    setName,
    emoji,
    setEmoji,
    quantityUnit,
    setQuantityUnit,
    showCombinedStats,
    setShowCombinedStats,
    kindEntries,
    isSubmitting,
    isUploadingImage,
    currentIconType,
    uploadedBlob,
    showDeleteConfirm,
    setShowDeleteConfirm,
    error,
    setError,
    handlePickImage,
    handleClearImage,
    recordingMode,
    setRecordingMode,
    recordingModeConfig,
    setRecordingModeConfig,
    handleSave,
    handleDelete,
    addKind,
    removeKind,
    updateKindName,
    updateKindColor,
  } = useEditActivityDialog(activity, onUpdated, onClose);

  if (!activity) return null;

  return (
    <ModalOverlay
      visible={visible}
      onClose={onClose}
      title="アクティビティ編集"
      footer={
        <View className="flex-row gap-2">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl items-center ${
              isSubmitting || !name.trim() ? "bg-gray-400" : "bg-gray-900"
            }`}
            onPress={handleSave}
            disabled={isSubmitting || !name.trim()}
          >
            <Text className="text-white font-bold text-base">
              {isSubmitting ? "保存中..." : "保存"}
            </Text>
          </TouchableOpacity>

          {!showDeleteConfirm ? (
            <TouchableOpacity
              className="px-4 py-3 rounded-xl items-center border border-red-300"
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Text className="text-red-500 font-medium text-sm">削除</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className={`px-4 py-3 rounded-xl items-center ${
                isSubmitting ? "bg-red-300" : "bg-red-500"
              }`}
              onPress={handleDelete}
              disabled={isSubmitting}
            >
              <Text className="text-white font-medium text-sm">本当に削除</Text>
            </TouchableOpacity>
          )}
        </View>
      }
    >
      <View className="gap-4">
        {currentIconType !== "upload" && (
          <EmojiPicker value={emoji} onChange={setEmoji} />
        )}

        <ActivityIconPicker
          iconType={currentIconType}
          blob={uploadedBlob}
          isProcessing={isUploadingImage}
          onPickImage={handlePickImage}
          onClearImage={handleClearImage}
        />

        <View>
          <Text className="text-sm text-gray-500 mb-1">名前</Text>
          <IMESafeTextInput
            className="border border-gray-300 rounded-lg px-4 h-11 text-base"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (error) setError("");
            }}
          />
        </View>

        <View>
          <Text className="text-sm text-gray-500 mb-1">単位（任意）</Text>
          <IMESafeTextInput
            className="border border-gray-300 rounded-lg px-4 h-11 text-base"
            value={quantityUnit}
            onChangeText={setQuantityUnit}
            placeholder="例: km, 回, 分"
          />
        </View>

        <RecordingModeSelector
          recordingMode={recordingMode}
          onRecordingModeChange={setRecordingMode}
          recordingModeConfig={recordingModeConfig}
          onRecordingModeConfigChange={setRecordingModeConfig}
        />

        <View className="flex-row items-center justify-between py-2">
          <Text className="text-sm text-gray-700">統計を合算表示</Text>
          <Switch
            value={showCombinedStats}
            onValueChange={setShowCombinedStats}
          />
        </View>

        <View>
          <Text className="text-sm text-gray-500 mb-2">種類</Text>
          {kindEntries.map((kind, index) => (
            <View
              key={kind.id ?? `new-${index}`}
              className="flex-row items-center mb-2 gap-2"
            >
              <IMESafeTextInput
                className="flex-1 border border-gray-300 rounded-lg px-3 h-9 text-sm"
                value={kind.name}
                onChangeText={(t) => updateKindName(index, t)}
                placeholder="種類名"
              />
              <KindColorPicker
                color={kind.color}
                onColorChange={(c) => updateKindColor(index, c)}
              />
              <TouchableOpacity
                onPress={() => removeKind(index)}
                className="px-2 py-1"
              >
                <Text className="text-red-500 text-base">-</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={addKind}>
            <Text className="text-sm text-blue-600 font-medium">
              + 種類を追加
            </Text>
          </TouchableOpacity>
        </View>

        {error ? <Text className="text-red-500 text-sm">{error}</Text> : null}
      </View>
    </ModalOverlay>
  );
}
