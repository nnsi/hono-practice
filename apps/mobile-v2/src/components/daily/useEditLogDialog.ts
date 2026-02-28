import { useState, useEffect } from "react";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityLogRepository } from "../../repositories/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";

type Log = {
  id: string;
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  memo: string;
  date: string;
  time: string | null;
};

export function useEditLogDialog(log: Log, onClose: () => void) {
  // state
  const [quantity, setQuantity] = useState(
    log.quantity !== null ? String(log.quantity) : "",
  );
  const [memo, setMemo] = useState(log.memo);
  const [selectedKindId, setSelectedKindId] = useState<string | null>(
    log.activityKindId,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // data
  const { kinds } = useActivityKinds(log.activityId);

  // sync state when log changes
  useEffect(() => {
    setQuantity(log.quantity !== null ? String(log.quantity) : "");
    setMemo(log.memo);
    setSelectedKindId(log.activityKindId);
    setShowDeleteConfirm(false);
  }, [log]);

  // handlers
  const handleSave = async () => {
    const parsed = quantity !== "" ? Number(quantity) : null;
    if (parsed !== null && !Number.isFinite(parsed)) return;
    setIsSubmitting(true);
    await activityLogRepository.updateActivityLog(log.id, {
      quantity: parsed,
      memo,
      activityKindId: selectedKindId,
    });
    syncEngine.syncActivityLogs();
    setIsSubmitting(false);
    onClose();
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    await activityLogRepository.softDeleteActivityLog(log.id);
    syncEngine.syncActivityLogs();
    setIsSubmitting(false);
    onClose();
  };

  return {
    // form state
    quantity,
    setQuantity,
    memo,
    setMemo,
    selectedKindId,
    setSelectedKindId,
    isSubmitting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    // data
    kinds,
    // handlers
    handleSave,
    handleDelete,
  };
}
