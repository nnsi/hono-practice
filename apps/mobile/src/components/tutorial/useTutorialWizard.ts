import { useCallback, useState } from "react";

import {
  TUTORIAL_STEPS,
  type TutorialStep,
} from "@packages/frontend-shared/hooks";

type UseTutorialWizardProps = {
  complete: () => Promise<void>;
  skip: () => Promise<void>;
};

type UseTutorialWizardReturn = {
  currentStep: TutorialStep;
  currentIndex: number;
  totalSteps: number;
  showSkip: boolean;
  canGoBack: boolean;
  isCreateActivityVisible: boolean;
  next: () => void;
  back: () => void;
  handleSkip: () => Promise<void>;
  handleComplete: () => Promise<void>;
  handlePrimary: () => Promise<void>;
  openCreateActivity: () => void;
  onActivityCreated: () => void;
  closeCreateActivity: () => void;
};

export function useTutorialWizard({
  complete,
  skip,
}: UseTutorialWizardProps): UseTutorialWizardReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCreateActivityVisible, setIsCreateActivityVisible] = useState(false);

  const currentStep = TUTORIAL_STEPS[currentIndex];
  const totalSteps = TUTORIAL_STEPS.length;
  const showSkip = currentIndex < totalSteps - 1;
  const canGoBack = currentIndex > 0;

  const next = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, totalSteps - 1));
  }, [totalSteps]);

  const back = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleSkip = useCallback(async () => {
    await skip();
  }, [skip]);

  const handleComplete = useCallback(async () => {
    await complete();
  }, [complete]);

  const openCreateActivity = useCallback(() => {
    setIsCreateActivityVisible(true);
  }, []);

  const closeCreateActivity = useCallback(() => {
    setIsCreateActivityVisible(false);
  }, []);

  const onActivityCreated = useCallback(() => {
    setIsCreateActivityVisible(false);
    next();
  }, [next]);

  const handlePrimary = useCallback(async () => {
    if (currentStep === "done") {
      await handleComplete();
    } else if (currentStep === "createActivity") {
      openCreateActivity();
    } else {
      next();
    }
  }, [currentStep, handleComplete, openCreateActivity, next]);

  return {
    currentStep,
    currentIndex,
    totalSteps,
    showSkip,
    canGoBack,
    isCreateActivityVisible,
    next,
    back,
    handleSkip,
    handleComplete,
    handlePrimary,
    openCreateActivity,
    onActivityCreated,
    closeCreateActivity,
  };
}
