import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import { useTranslation } from "@packages/i18n";
import { Switch, Text, View } from "react-native";

import { EmojiPicker } from "../common/EmojiPicker";
import { FormInput } from "../common/FormInput";
import { ModalOverlay } from "../common/ModalOverlay";
import { ActivityIconPicker } from "./ActivityIconPicker";
import { EditActivityDialogFooter } from "./EditActivityDialogFooter";
import { EditActivityKindList } from "./EditActivityKindList";
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
        <EditActivityDialogFooter
          isSubmitting={isSubmitting}
          nameTrimmed={!!name.trim()}
          showDeleteConfirm={showDeleteConfirm}
          onSave={handleSave}
          onDeleteRequest={() => setShowDeleteConfirm(true)}
          onDeleteConfirm={handleDelete}
        />
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
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t("name")}
          </Text>
          <FormInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError("");
            }}
            accessibilityLabel={t("name")}
          />
        </View>

        <View>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t("unitLabel")}
          </Text>
          <FormInput
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

        <EditActivityKindList
          kindEntries={kindEntries}
          onUpdateName={updateKindName}
          onUpdateColor={updateKindColor}
          onRemove={removeKind}
          onAdd={addKind}
        />

        {error ? (
          <Text className="text-red-500 dark:text-red-400 text-sm">
            {error}
          </Text>
        ) : null}
      </View>
    </ModalOverlay>
  );
}
