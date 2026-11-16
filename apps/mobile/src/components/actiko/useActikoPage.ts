import { useMemo, useState } from "react";

import { createUseActikoPage } from "@packages/frontend-shared/hooks/useActikoPage";

import { useLiveQuery } from "../../db/useLiveQuery";
import { activityRepository } from "../../repositories/activityRepository";
import { useDailyPage } from "../daily/useDailyPage";

export type Activity =
  import("@packages/domain/activity/activityRecord").ActivityRecord & {
    _syncStatus: string;
  };

export const useActikoPage = createUseActikoPage({
  react: { useState, useMemo },
  useDailyPage,
  useIconBlobs: () =>
    useLiveQuery(
      "activity_icon_blobs",
      () => activityRepository.getAllIconBlobs(),
      [],
    ),
});
