import { useState } from "react";

import { addDays, getToday } from "@packages/frontend-shared/utils/dateUtils";
import { useLiveQuery } from "dexie-react-hooks";

import { goalFreezePeriodRepository } from "../../db/goalFreezePeriodRepository";
import { db } from "../../db/schema";
import { syncEngine } from "../../sync/syncEngine";

export function useFreezePeriodManager(goalId: string) {
  const today = getToday();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");

  const freezePeriods = useLiveQuery(
    () =>
      db.goalFreezePeriods
        .where("goalId")
        .equals(goalId)
        .filter((fp) => !fp.deletedAt)
        .toArray(),
    [goalId],
  );

  const sorted = freezePeriods
    ? [...freezePeriods].sort((a, b) => b.startDate.localeCompare(a.startDate))
    : null;

  const activePeriod = sorted?.find(
    (fp) =>
      fp.startDate <= today && (fp.endDate == null || fp.endDate >= today),
  );

  const handleFreezeToday = async () => {
    await goalFreezePeriodRepository.createGoalFreezePeriod({
      goalId,
      startDate: today,
    });
    syncEngine.syncGoalFreezePeriods();
  };

  const handleFreezeWithDates = async () => {
    await goalFreezePeriodRepository.createGoalFreezePeriod({
      goalId,
      startDate,
      endDate: endDate || null,
    });
    setShowForm(false);
    setStartDate(today);
    setEndDate("");
    syncEngine.syncGoalFreezePeriods();
  };

  const handleResume = async (id: string) => {
    const period = sorted?.find((fp) => fp.id === id);
    if (period?.startDate === today) {
      await goalFreezePeriodRepository.softDeleteGoalFreezePeriod(id);
    } else {
      const yesterday = addDays(getToday(), -1);
      await goalFreezePeriodRepository.updateGoalFreezePeriod(id, {
        endDate: yesterday,
      });
    }
    syncEngine.syncGoalFreezePeriods();
  };

  const handleDelete = async (id: string) => {
    await goalFreezePeriodRepository.softDeleteGoalFreezePeriod(id);
    setDeletingId(null);
    syncEngine.syncGoalFreezePeriods();
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setStartDate(today);
    setEndDate("");
  };

  return {
    today,
    sorted,
    activePeriod,
    deletingId,
    setDeletingId,
    showForm,
    setShowForm,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    handleFreezeToday,
    handleFreezeWithDates,
    handleResume,
    handleDelete,
    handleCancelForm,
  };
}
