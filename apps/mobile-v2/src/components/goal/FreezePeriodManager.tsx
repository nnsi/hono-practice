import { useMemo, useState } from "react";

import type { FreezePeriod } from "@packages/domain/goal/goalBalance";
import dayjs from "dayjs";
import { Pause, Play, Trash2 } from "lucide-react-native";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import { getDatabase } from "../../db/database";
import { useLiveQuery } from "../../db/useLiveQuery";
import { goalFreezePeriodRepository } from "../../repositories/goalFreezePeriodRepository";
import { DatePickerField } from "../common/DatePickerField";

type FreezePeriodRow = FreezePeriod & { id: string };

export function FreezePeriodManager({ goalId }: { goalId: string }) {
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const today = dayjs().format("YYYY-MM-DD");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState<string | null>(null);

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

  const handleFreezeToday = async () => {
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

  const handleFreezeWithDates = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await goalFreezePeriodRepository.createGoalFreezePeriod({
        goalId,
        startDate,
        endDate,
      });
      setShowForm(false);
      setStartDate(today);
      setEndDate(null);
    } finally {
      setBusy(false);
    }
  };

  const handleResume = async () => {
    if (!activePeriod || busy) return;
    setBusy(true);
    try {
      if (activePeriod.startDate === today) {
        // 今日開始→今日再開はフリーズ不要なので削除
        await goalFreezePeriodRepository.softDeleteGoalFreezePeriod(
          activePeriod.id,
        );
      } else {
        // endDateは昨日（inclusive）にセット
        const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
        await goalFreezePeriodRepository.updateGoalFreezePeriod(
          activePeriod.id,
          { endDate: yesterday },
        );
      }
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

      {/* Action buttons */}
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
      ) : showForm ? (
        /* Date picker form */
        <View className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
          <DatePickerField
            value={startDate}
            onChange={setStartDate}
            label="開始日"
          />
          <View className="mt-2">
            <Text className="text-sm text-gray-500 mb-1">終了日</Text>
            {endDate ? (
              <View className="flex-row items-center">
                <DatePickerField value={endDate} onChange={setEndDate} />
                <TouchableOpacity
                  onPress={() => setEndDate(null)}
                  className="ml-2 px-2 py-1"
                >
                  <Text className="text-xs text-gray-500">クリア</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setEndDate(startDate)}
                className="py-1"
              >
                <Text className="text-sm text-blue-600">
                  終了日を設定（空なら手動で再開）
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View className="flex-row justify-end gap-2 mt-3">
            <TouchableOpacity
              onPress={() => {
                setShowForm(false);
                setStartDate(today);
                setEndDate(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <Text className="text-xs text-gray-600">キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleFreezeWithDates}
              disabled={busy}
              className="px-4 py-2 bg-blue-600 rounded-lg"
            >
              <Text className="text-xs font-medium text-white">
                一時停止する
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="flex-row gap-2 mb-3">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3"
            onPress={handleFreezeToday}
            disabled={busy}
            activeOpacity={0.7}
          >
            <Pause size={16} color="#2563eb" />
            <Text className="text-sm font-medium text-blue-700">今日から</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
            onPress={() => setShowForm(true)}
            activeOpacity={0.7}
          >
            <Text className="text-sm font-medium text-gray-600">日付指定</Text>
          </TouchableOpacity>
        </View>
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
