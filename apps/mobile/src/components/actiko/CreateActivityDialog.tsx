import { useTranslation } from "@packages/i18n";
import { Switch, Text, View } from "react-native";

import { EmojiPicker } from "../common/EmojiPicker";
import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { ModalOverlay } from "../common/ModalOverlay";
import { ActivityIconPicker } from "./ActivityIconPicker";
import { EditActivityKindList } from "./EditActivityKindList";
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
        <FormButton
          variant="primary"
          label={isSubmitting ? t("creating") : t("create")}
          onPress={handleCreate}
          disabled={isSubmitting || !name.trim()}
        />
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
          <FormInput
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
          kindEntries={kinds.map((k) => ({
            id: String(k.id),
            name: k.name,
            color: k.color,
          }))}
          onUpdateName={(index, text) => updateKindName(kinds[index].id, text)}
          onUpdateColor={(index, color) =>
            updateKindColor(kinds[index].id, color)
          }
          onRemove={(index) => removeKind(kinds[index].id)}
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
