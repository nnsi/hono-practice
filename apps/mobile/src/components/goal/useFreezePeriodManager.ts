import { useMemo, useState } from "react";

import type { FreezePeriod } from "@packages/domain/goal/goalBalance";
import { addDays, getToday } from "@packages/frontend-shared/utils/dateUtils";

import { getDatabase } from "../../db/database";
import { useLiveQuery } from "../../db/useLiveQuery";
import { goalFreezePeriodRepository } from "../../repositories/goalFreezePeriodRepository";
import { syncEngine } from "../../sync/syncEngine";

export type FreezePeriodRow = FreezePeriod & { id: string };

export function useFreezePeriodManager(goalId: string) {
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const today = getToday();
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
        const yesterday = addDays(getToday(), -1);
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

  const cancelForm = () => {
    setShowForm(false);
    setStartDate(today);
    setEndDate(null);
  };

  return {
    busy,
    showForm,
    setShowForm,
    deletingId,
    setDeletingId,
    today,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    rows,
    activePeriod,
    handleFreezeToday,
    handleFreezeWithDates,
    handleResume,
    handleDeleteConfirm,
    cancelForm,
  };
}
