import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";
import { Trash2 } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

type FreezePeriodRow = {
  id: string;
  startDate: string;
  endDate: string | null;
};

type FreezePeriodHistoryProps = {
  rows: FreezePeriodRow[];
  today: string;
  deletingId: string | null;
  onDeleteRequest: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
};

export function FreezePeriodHistory({
  rows,
  today,
  deletingId,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: FreezePeriodHistoryProps) {
  const { t } = useTranslation("goal");

  if (rows.length === 0) return null;

  return (
    <View className="gap-1">
      {rows.map((fp) => {
        const isActive =
          fp.startDate <= today && (fp.endDate == null || fp.endDate >= today);
        return (
          <View
            key={fp.id}
            className={`flex-row items-center px-3 py-2 rounded-lg ${isActive ? "bg-blue-50" : "bg-gray-50"}`}
          >
            <View
              className={`w-1.5 h-1.5 rounded-full mr-2 ${isActive ? "bg-blue-500" : "bg-gray-400"}`}
            />
            <Text className="text-xs text-gray-700 flex-1">
              {dayjs(fp.startDate).format("YYYY/M/D")} {t("dateRange")}{" "}
              {fp.endDate
                ? dayjs(fp.endDate).format("YYYY/M/D")
                : t("freezeInProgress")}
            </Text>
            {!isActive &&
              (deletingId === fp.id ? (
                <View className="flex-row items-center gap-1">
                  <TouchableOpacity
                    className="px-2 py-1 bg-red-500 rounded"
                    onPress={() => onDeleteConfirm(fp.id)}
                  >
                    <Text className="text-xs text-white">
                      {t("freezeDeleteButton")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="px-2 py-1 border border-gray-300 rounded"
                    onPress={onDeleteCancel}
                  >
                    <Text className="text-xs text-gray-600">
                      {t("freezeCancelButton")}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  className="p-1"
                  onPress={() => onDeleteRequest(fp.id)}
                >
                  <Trash2 size={12} color="#9ca3af" />
                </TouchableOpacity>
              ))}
          </View>
        );
      })}
    </View>
  );
}
