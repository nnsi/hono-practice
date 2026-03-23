import { Switch, Text, TouchableOpacity, View } from "react-native";

import { EmojiPicker } from "../common/EmojiPicker";
import { IMESafeTextInput } from "../common/IMESafeTextInput";
import { ModalOverlay } from "../common/ModalOverlay";
import { ActivityIconPicker } from "./ActivityIconPicker";
import { KindColorPicker } from "./KindColorPicker";
import { RecordingModeSelector } from "./RecordingModeSelector";
import { useCreateActivityDialog } from "./useCreateActivityDialog";

type CreateActivityDialogProps = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateActivityDialog({
  visible,
  onClose,
  onCreated,
}: CreateActivityDialogProps) {
  const {
    name,
    setName,
    emoji,
    setEmoji,
    quantityUnit,
    setQuantityUnit,
    showCombinedStats,
    setShowCombinedStats,
    kinds,
    recordingMode,
    setRecordingMode,
    recordingModeConfig,
    setRecordingModeConfig,
    isSubmitting,
    error,
    setError,
    iconType,
    pendingImage,
    isPickingImage,
    handleCreate,
    handleClose,
    handlePickImage,
    handleClearImage,
    addKind,
    removeKind,
    updateKindName,
    updateKindColor,
  } = useCreateActivityDialog(onCreated, onClose);

  return (
    <ModalOverlay
      visible={visible}
      onClose={handleClose}
      title="アクティビティ作成"
      footer={
        <TouchableOpacity
          className={`py-3 rounded-xl items-center ${
            isSubmitting || !name.trim() ? "bg-gray-400" : "bg-gray-900"
          }`}
          onPress={handleCreate}
          disabled={isSubmitting || !name.trim()}
        >
          <Text className="text-white font-bold text-base">
            {isSubmitting ? "作成中..." : "作成"}
          </Text>
        </TouchableOpacity>
      }
    >
      <View className="gap-4">
        {iconType !== "upload" && (
          <EmojiPicker value={emoji} onChange={setEmoji} />
        )}

        <ActivityIconPicker
          iconType={iconType}
          blob={pendingImage}
          isProcessing={isPickingImage}
          onPickImage={handlePickImage}
          onClearImage={handleClearImage}
        />

        <View>
          <Text className="text-sm text-gray-500 mb-1">名前</Text>
          <IMESafeTextInput
            className="border border-gray-300 rounded-lg px-3 py-2 text-base"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (error) setError("");
            }}
            placeholder="例: ランニング"
            autoFocus
          />
        </View>

        <View>
          <Text className="text-sm text-gray-500 mb-1">単位（任意）</Text>
          <IMESafeTextInput
            className="border border-gray-300 rounded-lg px-3 py-2 text-base"
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
          {kinds.map((kind) => (
            <View key={kind.id} className="flex-row items-center mb-2 gap-2">
              <IMESafeTextInput
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base"
                value={kind.name}
                onChangeText={(t) => updateKindName(kind.id, t)}
                placeholder="種類名"
              />
              <KindColorPicker
                color={kind.color}
                onColorChange={(c) => updateKindColor(kind.id, c)}
              />
              <TouchableOpacity
                onPress={() => removeKind(kind.id)}
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
