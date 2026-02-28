import { useState, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { createUseActikoPage } from "@packages/frontend-shared/hooks/useActikoPage";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";
import { db, type DexieActivity, type DexieActivityIconBlob } from "../../db/schema";

export const useActikoPage = createUseActikoPage<DexieActivity, DexieActivityIconBlob>({
  react: { useState, useMemo, useCallback },
  useActivities,
  useActivityLogsByDate,
  useIconBlobs: () => useLiveQuery(() => db.activityIconBlobs.toArray()),
});
