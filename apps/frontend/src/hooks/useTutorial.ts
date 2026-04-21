import { useCallback } from "react";

import {
  type TutorialAdapter,
  createUseTutorial,
} from "@packages/frontend-shared/hooks";
import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../db/schema";

const dexieAdapter: TutorialAdapter = {
  useStatus() {
    // useLiveQuery returns undefined while loading — treat as null (no tutorial shown)
    const result = useLiveQuery(() => db.authState.get("current"));
    if (result === undefined) return null;
    return result?.tutorialStatus ?? null;
  },
  async persistStatus(status) {
    await db.authState.update("current", { tutorialStatus: status });
  },
};

export const useTutorial = createUseTutorial({
  react: { useCallback },
  adapter: dexieAdapter,
});
