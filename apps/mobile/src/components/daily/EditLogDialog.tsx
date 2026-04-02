import { useTranslation } from "@packages/i18n";
import { Text, View } from "react-native";

import { useIconBlobMap } from "../../hooks/useIconBlobMap";
import { ActivityIcon } from "../common/ActivityIcon";
import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { FormTextarea } from "../common/FormTextarea";
import { ModalOverlay } from "../common/ModalOverlay";
import { EditLogKindSelector } from "./EditLogKindSelector";
import { useEditLogDialog } from "./useEditLogDialog";

type Log = {
  id: string;
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  memo: string;
  date: string;
  time: string | null;
};

type Activity = {
  id: string;
  name: string;
  emoji: string;
  iconType?: "emoji" | "upload" | "generate";
  iconUrl?: string | null;
  iconThumbnailUrl?: string | null;
  quantityUnit: string;
};

export function EditLogDialog({
  log,
  activity,
  onClose,
}: {
  log: Log;
  activity: Activity | null;
  onClose: () => void;
}) {
  const { t } = useTranslation("activity");
  const iconBlobMap = useIconBlobMap();

  const {
    quantity,
    setQuantity,
    memo,
    setMemo,
    selectedKindId,
    setSelectedKindId,
    isSubmitting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    kinds,
    handleSave,
    handleDelete,
  } = useEditLogDialog(log, onClose);

  return (
    <ModalOverlay
      visible
      onClose={onClose}
      title={
        <>
          <ActivityIcon
            iconType={activity?.iconType}
            emoji={activity?.emoji || "\u{1f4dd}"}
            iconBlob={activity ? iconBlobMap.get(activity.id) : undefined}
            iconUrl={activity?.iconUrl}
            iconThumbnailUrl={activity?.iconThumbnailUrl}
            size={24}
            fontSize="text-xl"
          />
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {activity?.name ?? t("log.unknownActivity")}
          </Text>
        </>
      }
      footer={
        <View className="flex-row gap-2">
          {!showDeleteConfirm ? (
            <FormButton
              variant="danger"
              label={t("log.deleteButton")}
              onPress={() => setShowDeleteConfirm(true)}
              className="px-4"
            />
          ) : (
            <FormButton
              variant="dangerConfirm"
              label={t("log.deleteButton")}
              onPress={handleDelete}
              disabled={isSubmitting}
              className="px-4"
            />
          )}
          <FormButton
            variant="primary"
            label={t("log.saveButton")}
            onPress={handleSave}
            disabled={isSubmitting}
            className="flex-1"
          />
        </View>
      }
    >
      <View className="gap-4">
        <EditLogKindSelector
          kinds={kinds}
          selectedKindId={selectedKindId}
          onSelect={setSelectedKindId}
        />

        {/* Quantity */}
        <View>
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t("log.quantityLabel")}
            {activity?.quantityUnit ? ` (${activity.quantityUnit})` : ""}
          </Text>
          <FormInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            accessibilityLabel={t("log.quantityLabel")}
            onFocus={() => {
              // Select all on focus is not directly supported in RN TextInput
            }}
          />
        </View>

        {/* Memo */}
        <View>
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t("log.memoLabel")}
          </Text>
          <FormTextarea
            value={memo}
            onChangeText={setMemo}
            placeholder={t("log.memoPlaceholder")}
            numberOfLines={2}
            accessibilityLabel={t("log.memoLabel")}
          />
        </View>
      </View>
    </ModalOverlay>
  );
}
