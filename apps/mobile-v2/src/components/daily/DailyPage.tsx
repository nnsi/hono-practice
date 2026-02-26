import { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { Plus } from "lucide-react-native";
import dayjs from "dayjs";
import { DatePickerField } from "../common/DatePickerField";
import { useActivityLogs } from "../../hooks/useActivityLogs";
import { useActivities } from "../../hooks/useActivities";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { LogCard } from "./LogCard";
import { CreateLogDialog } from "./CreateLogDialog";
import { EditLogDialog } from "./EditLogDialog";
import { activityLogRepository } from "../../repositories/activityLogRepository";

type Log = {
  id: string;
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  memo: string;
  date: string;
  time: string | null;
};

export function DailyPage() {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const { logs } = useActivityLogs(date);
  const { activities } = useActivities();
  const { kinds: allKinds } = useActivityKinds();
  const [showCreate, setShowCreate] = useState(false);
  const [editLog, setEditLog] = useState<Log | null>(null);

  const activityMap = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; emoji: string; quantityUnit: string }
    >();
    for (const a of activities) {
      map.set(a.id, a);
    }
    return map;
  }, [activities]);

  const kindMap = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; color: string | null }
    >();
    for (const k of allKinds) {
      map.set(k.id, k);
    }
    return map;
  }, [allKinds]);

  const handleLongPress = (log: Log) => {
    Alert.alert("操作", undefined, [
      { text: "編集", onPress: () => setEditLog(log) },
      {
        text: "削除",
        style: "destructive",
        onPress: () => {
          Alert.alert("削除確認", "このログを削除しますか？", [
            { text: "キャンセル", style: "cancel" },
            {
              text: "削除",
              style: "destructive",
              onPress: () =>
                activityLogRepository.softDeleteActivityLog(log.id),
            },
          ]);
        },
      },
      { text: "キャンセル", style: "cancel" },
    ]);
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Date selector */}
      <View className="items-center py-3 bg-white border-b border-gray-200">
        <DatePickerField value={date} onChange={setDate} />
      </View>

      {/* Logs */}
      {logs.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-4xl mb-3">📋</Text>
          <Text className="text-sm text-gray-400">
            この日のログはありません
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <LogCard
              log={item}
              activity={activityMap.get(item.activityId)}
              kind={
                item.activityKindId
                  ? kindMap.get(item.activityKindId)
                  : undefined
              }
              onPress={() => setEditLog(item)}
              onLongPress={() => handleLongPress(item)}
            />
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg"
        onPress={() => setShowCreate(true)}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* Dialogs */}
      <CreateLogDialog
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        initialDate={date}
      />
      <EditLogDialog
        visible={editLog !== null}
        onClose={() => setEditLog(null)}
        log={editLog}
        activity={
          editLog ? activityMap.get(editLog.activityId) : undefined
        }
      />
    </View>
  );
}
