import { useCallback } from "react";

import {
  type TutorialAdapter,
  type TutorialStatus,
  createUseTutorial,
} from "@packages/frontend-shared/hooks";

import {
  getTutorialStatus,
  setTutorialStatus,
} from "../auth/mobileAuthStateRepository";
import { useLiveQuery } from "../db/useLiveQuery";

function useAuthStateTutorialStatus(): TutorialStatus {
  const status = useLiveQuery("auth_state", async () => {
    return getTutorialStatus();
  });
  return status ?? null;
}

const tutorialAdapter: TutorialAdapter = {
  useStatus: useAuthStateTutorialStatus,
  persistStatus: async (status: TutorialStatus) => {
    await setTutorialStatus(status);
  },
};

export const useTutorial = createUseTutorial({
  react: { useCallback },
  adapter: tutorialAdapter,
});
