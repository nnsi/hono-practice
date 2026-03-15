import { useCallback, useMemo, useState } from "react";

import { createUseActikoPage } from "@packages/frontend-shared/hooks/useActikoPage";
import { useLiveQuery } from "dexie-react-hooks";

import {
  type DexieActivity,
  type DexieActivityIconBlob,
  db,
} from "../../db/schema";
import { useActivities } from "../../hooks/useActivities";
import { useActivityLogsByDate } from "../../hooks/useActivityLogs";

export const useActikoPage = createUseActikoPage<
  DexieActivity,
  DexieActivityIconBlob
>({
  react: { useState, useMemo, useCallback },
  useActivities,
  useActivityLogsByDate,
  useIconBlobs: () => useLiveQuery(() => db.activityIconBlobs.toArray()),
});
