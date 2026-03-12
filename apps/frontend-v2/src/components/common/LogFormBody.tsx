import { useState } from "react";

import { resolveRecordingMode } from "@packages/frontend-shared/recording-modes/resolveRecordingMode";
import type { SaveLogParams } from "@packages/frontend-shared/recording-modes/types";
import { useLiveQuery } from "dexie-react-hooks";

import { activityLogRepository } from "../../db/activityLogRepository";
import type { DexieActivity } from "../../db/schema";
import { db } from "../../db/schema";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { syncEngine } from "../../sync/syncEngine";
import { getRecordingModeComponent } from "../recording-modes/registry";

export function LogFormBody({
  activity,
  date,
  onDone,
}: {
  activity: DexieActivity;
  date: string;
  onDone: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { kinds } = useActivityKinds(activity.id);

  const todayLogs = useLiveQuery(
    () =>
      db.activityLogs
        .where("[date+activityId]")
        .equals([date, activity.id])
        .filter((l) => l.deletedAt === null)
        .toArray(),
    [date, activity.id],
  );

  const mode = resolveRecordingMode(activity);
  const ModeComponent = getRecordingModeComponent(mode);

  const handleSave = async (params: SaveLogParams) => {
    setIsSubmitting(true);
    await activityLogRepository.createActivityLog({
      activityId: activity.id,
      activityKindId: params.activityKindId,
      quantity: params.quantity,
      memo: params.memo,
      date,
      time: null,
    });
    syncEngine.syncActivityLogs();
    setIsSubmitting(false);
    onDone();
  };

  return (
    <ModeComponent
      activity={activity}
      kinds={kinds}
      date={date}
      onSave={handleSave}
      isSubmitting={isSubmitting}
      todayLogs={todayLogs?.map((l) => ({
        activityKindId: l.activityKindId,
        quantity: l.quantity,
      }))}
    />
  );
}
