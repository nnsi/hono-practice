import { dateStringSchema } from "@packages/types/dateSchemas";

import type { ActivityLogBase, ReactHooks } from "./types";

type UseEditLogDialogDeps = {
  react: Pick<ReactHooks, "useState" | "useEffect">;
  useActivityKinds: (activityId: string) => {
    kinds: { id: string; name: string; color: string | null }[];
  };
  activityLogRepository: {
    updateActivityLog: (
      id: string,
      data: {
        date: string;
        quantity: number | null;
        memo: string;
        activityKindId: string | null;
      },
    ) => Promise<unknown>;
    softDeleteActivityLog: (id: string) => Promise<unknown>;
  };
  syncEngine: { syncActivityLogs: () => void };
};

export function createUseEditLogDialog(deps: UseEditLogDialogDeps) {
  const {
    react: { useState, useEffect },
    useActivityKinds,
    activityLogRepository,
    syncEngine,
  } = deps;

  return function useEditLogDialog(log: ActivityLogBase, onClose: () => void) {
    const [quantity, setQuantity] = useState(
      log.quantity !== null ? String(log.quantity) : "",
    );
    const [date, setDate] = useState(log.date);
    const [memo, setMemo] = useState(log.memo);
    const [selectedKindId, setSelectedKindId] = useState<string | null>(
      log.activityKindId,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const { kinds } = useActivityKinds(log.activityId);

    // sync state when log changes (from mobile's improvement)
    useEffect(() => {
      setQuantity(log.quantity !== null ? String(log.quantity) : "");
      setDate(log.date);
      setMemo(log.memo);
      setSelectedKindId(log.activityKindId);
      setShowDeleteConfirm(false);
    }, [log]);

    const handleSave = async () => {
      if (!dateStringSchema.safeParse(date).success) return;
      const parsed = quantity !== "" ? Number(quantity) : null;
      if (parsed !== null && !Number.isFinite(parsed)) return;
      if (parsed !== null && (parsed < 0 || parsed > 999999)) return;
      setIsSubmitting(true);
      await activityLogRepository.updateActivityLog(log.id, {
        date,
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
      date,
      setDate,
      quantity,
      setQuantity,
      memo,
      setMemo,
      selectedKindId,
      setSelectedKindId,
      isSubmitting,
      showDeleteConfirm,
      setShowDeleteConfirm,
      kinds,
      handleSave,
      handleDelete,
    };
  };
}
