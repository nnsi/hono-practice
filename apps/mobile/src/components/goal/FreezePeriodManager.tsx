import { useMemo, useState } from "react";

import type { FreezePeriod } from "@packages/domain/goal/goalBalance";
import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";
import { Pause, Play } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { getDatabase } from "../../db/database";
import { useLiveQuery } from "../../db/useLiveQuery";
import { goalFreezePeriodRepository } from "../../repositories/goalFreezePeriodRepository";
import { syncEngine } from "../../sync/syncEngine";
import { DatePickerField } from "../common/DatePickerField";
import { FreezePeriodHistory } from "./FreezePeriodHistory";

type FreezePeriodRow = FreezePeriod & { id: string };

export function FreezePeriodManager({ goalId }: { goalId: string }) {
  const { t } = useTranslation("goal");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const activePeriod = useMemo(
    () =>
      rows.find(
        (fp) =>
          fp.startDate <= today && (fp.endDate == null || fp.endDate >= today),
      ),
    [rows, today],
  );

  const handleFreezeToday = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await goalFreezePeriodRepository.createGoalFreezePeriod({
        goalId,
        startDate: today,
      });
      syncEngine.syncGoalFreezePeriods();
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
      syncEngine.syncGoalFreezePeriods();
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
        await goalFreezePeriodRepository.softDeleteGoalFreezePeriod(
          activePeriod.id,
        );
      } else {
        const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
        await goalFreezePeriodRepository.updateGoalFreezePeriod(
          activePeriod.id,
          { endDate: yesterday },
        );
      }
      syncEngine.syncGoalFreezePeriods();
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    await goalFreezePeriodRepository.softDeleteGoalFreezePeriod(id);
    setDeletingId(null);
    syncEngine.syncGoalFreezePeriods();
  };

  return (
    <View className="mt-3 border-t border-gray-100 pt-3">
      <Text className="text-xs font-medium text-gray-500 mb-2">
        {t("freezePeriodLabel")}
      </Text>

      {activePeriod ? (
        <TouchableOpacity
          className="flex-row items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-3"
          onPress={handleResume}
          disabled={busy}
          activeOpacity={0.7}
        >
          <Play size={16} color="#16a34a" />
          <Text className="text-sm font-medium text-green-700">
            {t("resumeButton")}
          </Text>
          <Text className="text-xs text-green-600 ml-auto">
            {dayjs(activePeriod.startDate).format("M/D")}
            {t("dateRange")}
          </Text>
        </TouchableOpacity>
      ) : showForm ? (
        <View className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
          <DatePickerField
            value={startDate}
            onChange={setStartDate}
            label={t("freezeStartDateLabel")}
          />
          <View className="mt-2">
            <Text className="text-sm text-gray-500 mb-1">
              {t("freezeEndDateLabel")}
            </Text>
            {endDate ? (
              <View className="flex-row items-center">
                <DatePickerField value={endDate} onChange={setEndDate} />
                <TouchableOpacity
                  onPress={() => setEndDate(null)}
                  className="ml-2 px-2 py-1"
                >
                  <Text className="text-xs text-gray-500">
                    {t("freezeCancelButton")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setEndDate(startDate)}
                className="py-1"
              >
                <Text className="text-sm text-blue-600">
                  {t("freezeEndDatePlaceholder")}
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
              <Text className="text-xs text-gray-600">{t("cancelButton")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleFreezeWithDates}
              disabled={busy}
              className="px-4 py-2 bg-blue-600 rounded-lg"
            >
              <Text className="text-xs font-medium text-white">
                {t("freezeConfirmButton")}
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
            <Text className="text-sm font-medium text-blue-700">
              {t("freezeTodayButton")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
            onPress={() => setShowForm(true)}
            activeOpacity={0.7}
          >
            <Text className="text-sm font-medium text-gray-600">
              {t("freezeByDateButton")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FreezePeriodHistory
        rows={rows}
        today={today}
        deletingId={deletingId}
        onDeleteRequest={setDeletingId}
        onDeleteConfirm={handleDeleteConfirm}
        onDeleteCancel={() => setDeletingId(null)}
      />
    </View>
  );
}
