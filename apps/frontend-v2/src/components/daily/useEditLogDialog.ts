import { useState } from "react";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityLogRepository } from "../../db/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";
import type { DexieActivityLog } from "../../db/schema";

export function useEditLogDialog(
  log: DexieActivityLog,
  onClose: () => void,
) {
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

  // handlers
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
