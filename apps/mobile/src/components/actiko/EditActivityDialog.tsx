import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import { useTranslation } from "@packages/i18n";
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

  const { t } = useTranslation("actiko");

  if (!activity) return null;

  return (
    <ModalOverlay
      visible={visible}
      onClose={onClose}
      title={t("editTitle")}
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
              {isSubmitting ? t("saving") : t("save")}
            </Text>
          </TouchableOpacity>

          {!showDeleteConfirm ? (
            <TouchableOpacity
              className="px-4 py-3 rounded-xl items-center border border-red-300"
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Text className="text-red-500 dark:text-red-400 font-medium text-sm">
                {t("delete")}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className={`px-4 py-3 rounded-xl items-center ${
                isSubmitting ? "bg-red-300" : "bg-red-50 dark:bg-red-900/200"
              }`}
              onPress={handleDelete}
              disabled={isSubmitting}
            >
              <Text className="text-white font-medium text-sm">
                {t("confirmDelete")}
              </Text>
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
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("name")}</Text>
          <IMESafeTextInput
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError("");
            }}
          />
        </View>

        <View>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t("unitLabel")}</Text>
          <IMESafeTextInput
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base"
            value={quantityUnit}
            onChangeText={setQuantityUnit}
            placeholder={t("unitExamplePlaceholder")}
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
          />
        </View>

        <View>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t("kinds")}</Text>
          {kindEntries.map((kind, index) => (
            <View
              key={kind.id ?? `new-${index}`}
              className="flex-row items-center mb-2 gap-2"
            >
              <IMESafeTextInput
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base"
                value={kind.name}
                onChangeText={(text) => updateKindName(index, text)}
                placeholder={t("kindPlaceholder")}
              />
              <KindColorPicker
                color={kind.color}
                onColorChange={(c) => updateKindColor(index, c)}
              />
              <TouchableOpacity
                onPress={() => removeKind(index)}
                className="px-2 py-1"
              >
                <Text className="text-red-500 dark:text-red-400 text-base">-</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={addKind}>
            <Text className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              {t("addKind")}
            </Text>
          </TouchableOpacity>
        </View>

        {error ? <Text className="text-red-500 dark:text-red-400 text-sm">{error}</Text> : null}
      </View>
    </ModalOverlay>
  );
}
