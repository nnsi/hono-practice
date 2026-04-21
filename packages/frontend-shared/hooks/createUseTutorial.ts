import type { ReactHooks } from "./types";

export type TutorialStatus = "pending" | "done" | null;

export type TutorialAdapter = {
  useStatus: () => TutorialStatus;
  persistStatus: (status: TutorialStatus) => Promise<void>;
};

export type UseTutorialReturn = {
  status: TutorialStatus;
  isOpen: boolean;
  complete: () => Promise<void>;
  skip: () => Promise<void>;
};

export const TUTORIAL_STEPS = [
  "welcome",
  "createActivity",
  "record",
  "done",
] as const;

export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

type CreateUseTutorialDeps = {
  react: Pick<ReactHooks, "useCallback">;
  adapter: TutorialAdapter;
};

export function createUseTutorial(deps: CreateUseTutorialDeps) {
  const {
    react: { useCallback },
    adapter,
  } = deps;

  return function useTutorial(): UseTutorialReturn {
    const status = adapter.useStatus();
    const isOpen = status === "pending";

    const complete = useCallback(async () => {
      await adapter.persistStatus("done");
    }, []);

    const skip = useCallback(async () => {
      await adapter.persistStatus("done");
    }, []);

    return { status, isOpen, complete, skip };
  };
}
