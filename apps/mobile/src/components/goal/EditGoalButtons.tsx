import { useTranslation } from "@packages/i18n";
import { Trash2 } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

type EditGoalButtonsProps = {
  saving: boolean;
  showDeactivateConfirm: boolean;
  showDeleteConfirm: boolean;
  onSave: () => void;
  onDeactivateRequest: () => void;
  onDeactivateConfirm: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
};

export function EditGoalButtons({
  saving,
  showDeactivateConfirm,
  showDeleteConfirm,
  onSave,
  onDeactivateRequest,
  onDeactivateConfirm,
  onDeleteRequest,
  onDeleteConfirm,
}: EditGoalButtonsProps) {
  const { t } = useTranslation("goal");

  return (
    <View className="flex-row gap-2 pt-1">
      <TouchableOpacity
        className={`flex-1 py-2 rounded-lg items-center ${saving ? "bg-gray-400" : "bg-gray-900"}`}
        onPress={onSave}
        disabled={saving}
      >
        <Text className="text-white text-sm font-medium">
          {t("saveButton")}
        </Text>
      </TouchableOpacity>

      {!showDeactivateConfirm ? (
        <TouchableOpacity
          className="px-4 py-2 bg-orange-500 rounded-lg items-center"
          onPress={onDeactivateRequest}
          disabled={saving}
        >
          <Text className="text-white text-sm font-medium">
            {t("deactivateButton")}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          className="px-4 py-2 bg-red-600 rounded-lg items-center"
          onPress={onDeactivateConfirm}
          disabled={saving}
        >
          <Text className="text-white text-sm font-medium">
            {t("deactivateConfirmButton")}
          </Text>
        </TouchableOpacity>
      )}

      {!showDeleteConfirm ? (
        <TouchableOpacity
          className="px-3 py-2 border border-red-300 rounded-lg items-center justify-center"
          onPress={onDeleteRequest}
          disabled={saving}
        >
          <Trash2 size={14} color="#ef4444" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          className="px-3 py-2 bg-red-500 rounded-lg items-center justify-center"
          onPress={onDeleteConfirm}
          disabled={saving}
        >
          <Text className="text-white text-sm">{t("deleteButton")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
