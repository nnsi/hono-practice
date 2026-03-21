import { useMemo } from "react";

import { useLiveQuery } from "../db/useLiveQuery";
import { activityRepository } from "../repositories/activityRepository";

export function useIconBlobMap() {
  const iconBlobs = useLiveQuery(
    "activity_icon_blobs",
    () => activityRepository.getAllIconBlobs(),
    [],
  );
  return useMemo(() => {
    const map = new Map<string, { base64: string; mimeType: string }>();
    for (const blob of iconBlobs ?? []) {
      map.set(blob.activityId, blob);
    }
    return map;
  }, [iconBlobs]);
}
