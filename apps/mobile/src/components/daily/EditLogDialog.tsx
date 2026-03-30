import { useTranslation } from "@packages/i18n";
import { Trash2 } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { useIconBlobMap } from "../../hooks/useIconBlobMap";
import { ActivityIcon } from "../common/ActivityIcon";
import { IMESafeTextInput } from "../common/IMESafeTextInput";
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
          <TouchableOpacity
            className={`flex-1 py-3 rounded-lg items-center ${
              isSubmitting ? "bg-gray-400" : "bg-gray-900"
            }`}
            onPress={handleSave}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={t("log.saveButton")}
          >
            <Text className="text-white font-medium">
              {t("log.saveButton")}
            </Text>
          </TouchableOpacity>

          {!showDeleteConfirm ? (
            <TouchableOpacity
              className="px-4 py-3 rounded-lg border border-red-300 items-center justify-center"
              onPress={() => setShowDeleteConfirm(true)}
              accessibilityRole="button"
              accessibilityLabel={t("log.deleteButton")}
            >
              <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className={`px-4 py-3 rounded-lg items-center justify-center ${
                isSubmitting ? "bg-red-300" : "bg-red-50 dark:bg-red-900/200"
              }`}
              onPress={handleDelete}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={t("log.deleteButton")}
            >
              <Text className="text-white font-medium">
                {t("log.deleteButton")}
              </Text>
            </TouchableOpacity>
          )}
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
          <IMESafeTextInput
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base"
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
          <IMESafeTextInput
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
            value={memo}
            onChangeText={setMemo}
            placeholder={t("log.memoPlaceholder")}
            multiline
            numberOfLines={2}
            accessibilityLabel={t("log.memoLabel")}
          />
        </View>
      </View>
    </ModalOverlay>
  );
}
