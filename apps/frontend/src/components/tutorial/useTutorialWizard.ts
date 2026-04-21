import { useCallback, useState } from "react";

import {
  TUTORIAL_STEPS,
  type TutorialStep,
} from "@packages/frontend-shared/hooks";

type UseTutorialWizardProps = {
  onComplete: () => Promise<void>;
  onSkip: () => Promise<void>;
};

type UseTutorialWizardReturn = {
  currentStep: TutorialStep;
  currentIndex: number;
  totalSteps: number;
  showSkip: boolean;
  createActivityOpen: boolean;
  next: () => void;
  back: () => void;
  complete: () => Promise<void>;
  skip: () => Promise<void>;
  handlePrimary: () => Promise<void>;
  openCreateActivity: () => void;
  closeCreateActivity: () => void;
  onActivityCreated: () => void;
};

export function useTutorialWizard({
  onComplete,
  onSkip,
}: UseTutorialWizardProps): UseTutorialWizardReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [createActivityOpen, setCreateActivityOpen] = useState(false);

  const totalSteps = TUTORIAL_STEPS.length;
  const currentStep = TUTORIAL_STEPS[currentIndex];
  // Show skip on all steps except the final "done" step
  const showSkip = currentIndex < totalSteps - 1;

  const next = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, totalSteps - 1));
  }, [totalSteps]);

  const back = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const complete = useCallback(async () => {
    await onComplete();
  }, [onComplete]);

  const skip = useCallback(async () => {
    await onSkip();
  }, [onSkip]);

  const openCreateActivity = useCallback(() => {
    setCreateActivityOpen(true);
  }, []);

  const closeCreateActivity = useCallback(() => {
    setCreateActivityOpen(false);
  }, []);

  const onActivityCreated = useCallback(() => {
    setCreateActivityOpen(false);
    next();
  }, [next]);

  const handlePrimary = useCallback(async () => {
    if (currentStep === "done") {
      await complete();
    } else if (currentStep === "createActivity") {
      openCreateActivity();
    } else {
      next();
    }
  }, [currentStep, complete, openCreateActivity, next]);

  return {
    currentStep,
    currentIndex,
    totalSteps,
    showSkip,
    createActivityOpen,
    next,
    back,
    complete,
    skip,
    handlePrimary,
    openCreateActivity,
    closeCreateActivity,
    onActivityCreated,
  };
}
