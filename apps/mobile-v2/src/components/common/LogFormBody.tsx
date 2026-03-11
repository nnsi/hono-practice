import { useState } from "react";

import { resolveRecordingMode } from "@packages/frontend-shared/recording-modes/resolveRecordingMode";
import type { SaveLogParams } from "@packages/frontend-shared/recording-modes/types";

import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityLogRepository } from "../../repositories/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";
import { getRecordingModeComponent } from "../recording-modes/registry";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
  recordingMode?: string;
};

export function LogFormBody({
  activity,
  date,
  onDone,
}: {
  activity: Activity;
  date: string;
  onDone: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { kinds } = useActivityKinds(activity.id);

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
    />
  );
}
