import { TUTORIAL_STEPS } from "@packages/frontend-shared/hooks";
import { useTranslation } from "@packages/i18n";

import { useTutorial } from "../../hooks/useTutorial";
import { CreateActivityDialog } from "../actiko/CreateActivityDialog";
import { useTutorialWizard } from "./useTutorialWizard";

export function TutorialWizard() {
  const { complete, skip } = useTutorial();
  const {
    currentStep,
    currentIndex,
    totalSteps,
    showSkip,
    createActivityOpen,
    back,
    skip: handleSkip,
    handlePrimary,
    closeCreateActivity,
    onActivityCreated,
  } = useTutorialWizard({ onComplete: complete, onSkip: skip });

  const { t } = useTranslation("tutorial");

  const showBack = currentIndex > 0;

  return (
    <>
      {/* Full-screen overlay — z-40 so CreateActivityDialog (z-50) can appear above it */}
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 dark:bg-black/70">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
          {/* Step indicator */}
          <div className="mb-6 flex flex-col items-center gap-2">
            <div className="flex gap-2">
              {TUTORIAL_STEPS.map((stepKey, i) => (
                <span
                  key={stepKey}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i === currentIndex
                      ? "bg-amber-500"
                      : i < currentIndex
                        ? "bg-amber-300"
                        : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {t("stepIndicator", {
                current: currentIndex + 1,
                total: totalSteps,
              })}
            </span>
          </div>

          {/* Step content */}
          <div className="mb-8 text-center">
            <h2 className="mb-3 text-xl font-bold text-gray-900 dark:text-gray-50">
              {t(`steps.${currentStep}.title`)}
            </h2>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {t(`steps.${currentStep}.body`)}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: skip */}
            {showSkip ? (
              <button
                type="button"
                onClick={handleSkip}
                className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors dark:text-gray-500 dark:hover:text-gray-300"
              >
                {t("skip")}
              </button>
            ) : (
              <span />
            )}

            {/* Right: back + primary */}
            <div className="flex items-center gap-2">
              {showBack && (
                <button
                  type="button"
                  onClick={back}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  {t("back")}
                </button>
              )}
              <button
                type="button"
                onClick={handlePrimary}
                className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                {t(`steps.${currentStep}.cta`)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CreateActivity dialog — rendered outside the overlay div to avoid z-index nesting issues */}
      {createActivityOpen && (
        <CreateActivityDialog
          onClose={closeCreateActivity}
          onCreated={onActivityCreated}
        />
      )}
    </>
  );
}
