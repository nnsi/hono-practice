import { useTranslation } from "@packages/i18n";
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

  const { t } = useTranslation("actiko");

  return (
    <ModalOverlay
      visible={visible}
      onClose={handleClose}
      title={t("createTitle")}
      footer={
        <TouchableOpacity
          className={`py-3 rounded-xl items-center ${
            isSubmitting || !name.trim() ? "bg-gray-400" : "bg-gray-900"
          }`}
          onPress={handleCreate}
          disabled={isSubmitting || !name.trim()}
        >
          <Text className="text-white font-bold text-base">
            {isSubmitting ? t("creating") : t("create")}
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
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t("name")}
          </Text>
          <IMESafeTextInput
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError("");
            }}
            placeholder={t("namePlaceholder")}
            autoFocus
            accessibilityLabel={t("name")}
          />
        </View>

        <View>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t("unitLabel")}
          </Text>
          <IMESafeTextInput
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base"
            value={quantityUnit}
            onChangeText={setQuantityUnit}
            placeholder={t("unitExamplePlaceholder")}
            accessibilityLabel={t("unitLabel")}
          />
        </View>

        <RecordingModeSelector
          recordingMode={recordingMode}
          onRecordingModeChange={setRecordingMode}
          recordingModeConfig={recordingModeConfig}
          onRecordingModeConfigChange={setRecordingModeConfig}
        />

        <View className="flex-row items-center justify-between py-2">
          <Text className="text-sm text-gray-700 dark:text-gray-300">
            {t("combinedStatsLabel")}
          </Text>
          <Switch
            value={showCombinedStats}
            onValueChange={setShowCombinedStats}
            accessibilityRole="switch"
            accessibilityLabel={t("combinedStatsLabel")}
            accessibilityState={{ checked: showCombinedStats }}
          />
        </View>

        <View>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {t("kinds")}
          </Text>
          {kinds.map((kind) => (
            <View key={kind.id} className="flex-row items-center mb-2 gap-2">
              <IMESafeTextInput
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base"
                value={kind.name}
                onChangeText={(text) => updateKindName(kind.id, text)}
                placeholder={t("kindPlaceholder")}
                accessibilityLabel={t("kindPlaceholder")}
              />
              <KindColorPicker
                color={kind.color}
                onColorChange={(c) => updateKindColor(kind.id, c)}
              />
              <TouchableOpacity
                onPress={() => removeKind(kind.id)}
                className="px-2 py-1"
                accessibilityRole="button"
                accessibilityLabel={`Remove ${kind.name}`}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-red-500 dark:text-red-400 text-base">
                  -
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={addKind}
            accessibilityRole="button"
            accessibilityLabel={t("addKind")}
          >
            <Text className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              {t("addKind")}
            </Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <Text className="text-red-500 dark:text-red-400 text-sm">
            {error}
          </Text>
        ) : null}
      </View>
    </ModalOverlay>
  );
}
