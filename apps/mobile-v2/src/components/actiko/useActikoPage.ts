import { useState, useMemo, useCallback } from "react";
import { createUseActikoPage } from "@packages/frontend-shared/hooks/useActikoPage";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";
import { useLiveQuery } from "../../db/useLiveQuery";
import { activityRepository } from "../../repositories/activityRepository";

type Activity = import("@packages/domain/activity/activityRecord").ActivityRecord & {
  _syncStatus: string;
};

type IconBlob = {
  activityId: string;
  base64: string;
  mimeType: string;
};

export const useActikoPage = createUseActikoPage<Activity, IconBlob>({
  react: { useState, useMemo, useCallback },
  useActivities,
  useActivityLogsByDate,
  useIconBlobs: () =>
    useLiveQuery(
      "activity_icon_blobs",
      () => activityRepository.getPendingIconBlobs(),
      [],
    ),
});
