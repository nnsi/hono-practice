import { useCallback } from "react";

import {
  type TutorialAdapter,
  type TutorialStatus,
  createUseTutorial,
} from "@packages/frontend-shared/hooks";

import { useLiveQuery } from "../db/useLiveQuery";
import {
  getTutorialStatus,
  setTutorialStatus,
} from "../repositories/authStateRepository";

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
