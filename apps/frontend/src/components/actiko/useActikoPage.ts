import { useMemo, useState } from "react";

import { createUseActikoPage } from "@packages/frontend-shared/hooks/useActikoPage";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../../db/schema";
import { useDailyPage } from "../daily/useDailyPage";

export const useActikoPage = createUseActikoPage({
  react: { useState, useMemo },
  useDailyPage,
  useIconBlobs: () => useLiveQuery(() => db.activityIconBlobs.toArray()),
});
