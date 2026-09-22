import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createUseActikoPage } from "@packages/frontend-shared/hooks/useActikoPage";
import {
  resolveCardTapAction,
  shouldCollapseAfterSave,
} from "@packages/frontend-shared/recording-modes/cardTapAction";
import { useLiveQuery } from "dexie-react-hooks";

import {
  type DexieActivity,
  type DexieActivityIconBlob,
  db,
} from "../../db/schema";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";
import { saveActivityLog, undoActivityLog } from "../common/saveActivityLog";

const useSharedActikoPage = createUseActikoPage<
  DexieActivity,
  DexieActivityIconBlob
>({
  react: { useState, useMemo, useCallback },
  useActivities,
  useActivityLogsByDate,
  useIconBlobs: () => useLiveQuery(() => db.activityIconBlobs.toArray()),
});

/** カード上の即時記録を取り消せる猶予 */
const UNDO_WINDOW_MS = 5000;

type PendingUndo = {
  activityId: string;
  logId: string;
};

/**
 * Web の Actiko ページ。共有 hook にカード上での記録（展開・即時記録・取り消し）を足す。
 * モーダルは使わず、タップしたカードをその場で展開して記録モードの UI を出す。
 */
export function useActikoPage() {
  const page = useSharedActikoPage();
  const { date, hasLogsForActivity } = page;

  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(
    null,
  );
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const recordingRef = useRef<Set<string>>(new Set());

  const kinds = useLiveQuery(() =>
    db.activityKinds.filter((k) => !k.deletedAt).toArray(),
  );
  const activityIdsWithKinds = useMemo(
    () => new Set((kinds ?? []).map((k) => k.activityId)),
    [kinds],
  );

  // 日付を切り替えたら展開と取り消し猶予を閉じる
  useEffect(() => {
    setExpandedActivityId(null);
    setPendingUndo(null);
  }, [date]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const clearUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingUndo(null);
  }, []);

  const collapseCard = useCallback(() => setExpandedActivityId(null), []);

  const handleCardTap = async (activity: DexieActivity) => {
    const action = resolveCardTapAction(activity, {
      isDone: hasLogsForActivity(activity.id),
      hasKinds: activityIdsWithKinds.has(activity.id),
    });

    if (action === "expand") {
      setExpandedActivityId((prev) =>
        prev === activity.id ? null : activity.id,
      );
      return;
    }

    // check モードの即時記録。連打で二重登録しないよう in-flight を弾く
    if (recordingRef.current.has(activity.id)) return;
    recordingRef.current.add(activity.id);
    try {
      const { createdLogId } = await saveActivityLog(activity, date, {
        quantity: 1,
        memo: "",
        activityKindId: null,
      });
      if (createdLogId) {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setPendingUndo({ activityId: activity.id, logId: createdLogId });
        undoTimerRef.current = setTimeout(
          () => setPendingUndo(null),
          UNDO_WINDOW_MS,
        );
      }
    } finally {
      recordingRef.current.delete(activity.id);
    }
  };

  const handleUndo = async (activityId: string) => {
    if (!pendingUndo || pendingUndo.activityId !== activityId) return;
    const { logId } = pendingUndo;
    clearUndo();
    await undoActivityLog(logId);
  };

  const handleInlineSaved = (activity: DexieActivity) => {
    if (shouldCollapseAfterSave(activity)) setExpandedActivityId(null);
  };

  return {
    ...page,
    expandedActivityId,
    handleCardTap,
    collapseCard,
    handleInlineSaved,
    undoActivityId: pendingUndo?.activityId ?? null,
    handleUndo,
  };
}
