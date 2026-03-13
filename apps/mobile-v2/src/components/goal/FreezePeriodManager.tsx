import { useMemo, useState } from "react";

import type { FreezePeriod } from "@packages/domain/goal/goalBalance";
import dayjs from "dayjs";
import { Pause, Play, Trash2 } from "lucide-react-native";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import { getDatabase } from "../../db/database";
import { useLiveQuery } from "../../db/useLiveQuery";
import { goalFreezePeriodRepository } from "../../repositories/goalFreezePeriodRepository";

type FreezePeriodRow = FreezePeriod & { id: string };

export function FreezePeriodManager({ goalId }: { goalId: string }) {
  const [busy, setBusy] = useState(false);
  const today = dayjs().format("YYYY-MM-DD");

  const periods = useLiveQuery(["goal_freeze_periods"], async () => {
    const db = await getDatabase();
    return db.getAllAsync<{
      id: string;
      start_date: string;
      end_date: string | null;
    }>(
      `SELECT id, start_date, end_date FROM goal_freeze_periods
         WHERE goal_id = ? AND deleted_at IS NULL
         ORDER BY start_date DESC`,
      [goalId],
    );
  }, [goalId]);

  const rows: FreezePeriodRow[] = useMemo(() => {
    if (!periods) return [];
    return periods.map((p) => ({
      id: p.id,
      startDate: p.start_date,
      endDate: p.end_date,
    }));
  }, [periods]);

  const activePeriod = useMemo(() => {
    return rows.find(
      (fp) =>
        fp.startDate <= today && (fp.endDate == null || fp.endDate >= today),
    );
  }, [rows, today]);

  const handleFreeze = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await goalFreezePeriodRepository.createGoalFreezePeriod({
        goalId,
        startDate: today,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleResume = async () => {
    if (!activePeriod || busy) return;
    setBusy(true);
    try {
      await goalFreezePeriodRepository.updateGoalFreezePeriod(activePeriod.id, {
        endDate: today,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("削除確認", "この一時停止期間を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          await goalFreezePeriodRepository.softDeleteGoalFreezePeriod(id);
        },
      },
    ]);
  };

  return (
    <View className="mt-3 border-t border-gray-100 pt-3">
      <Text className="text-xs font-medium text-gray-500 mb-2">一時停止</Text>

      {/* Action button */}
      {activePeriod ? (
        <TouchableOpacity
          className="flex-row items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-3"
          onPress={handleResume}
          disabled={busy}
          activeOpacity={0.7}
        >
          <Play size={16} color="#16a34a" />
          <Text className="text-sm font-medium text-green-700">再開する</Text>
          <Text className="text-xs text-green-600 ml-auto">
            {dayjs(activePeriod.startDate).format("M/D")}〜
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          className="flex-row items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3"
          onPress={handleFreeze}
          disabled={busy}
          activeOpacity={0.7}
        >
          <Pause size={16} color="#2563eb" />
          <Text className="text-sm font-medium text-blue-700">
            一時停止する
          </Text>
        </TouchableOpacity>
      )}

      {/* History list */}
      {rows.length > 0 && (
        <View className="gap-1">
          {rows.map((fp) => {
            const isActive =
              fp.startDate <= today &&
              (fp.endDate == null || fp.endDate >= today);
            return (
              <View
                key={fp.id}
                className={`flex-row items-center px-3 py-2 rounded-lg ${
                  isActive ? "bg-blue-50" : "bg-gray-50"
                }`}
              >
                <View
                  className={`w-1.5 h-1.5 rounded-full mr-2 ${
                    isActive ? "bg-blue-500" : "bg-gray-400"
                  }`}
                />
                <Text className="text-xs text-gray-700 flex-1">
                  {dayjs(fp.startDate).format("YYYY/M/D")}
                  {" 〜 "}
                  {fp.endDate ? dayjs(fp.endDate).format("YYYY/M/D") : "継続中"}
                </Text>
                {!isActive && (
                  <TouchableOpacity
                    className="p-1"
                    onPress={() => handleDelete(fp.id)}
                  >
                    <Trash2 size={12} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
