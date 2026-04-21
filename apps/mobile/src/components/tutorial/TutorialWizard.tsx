import { TUTORIAL_STEPS } from "@packages/frontend-shared/hooks";
import { useTranslation } from "@packages/i18n";
import { Modal, Text, TouchableOpacity, View } from "react-native";

import { useThemeContext } from "../../contexts/ThemeContext";
import { CreateActivityDialog } from "../actiko/CreateActivityDialog";
import { FormButton } from "../common/FormButton";
import { useTutorialWizard } from "./useTutorialWizard";

type TutorialWizardProps = {
  complete: () => Promise<void>;
  skip: () => Promise<void>;
};

export function TutorialWizard({ complete, skip }: TutorialWizardProps) {
  const { t } = useTranslation("tutorial");
  const { colors } = useThemeContext();
  const {
    currentStep,
    currentIndex,
    totalSteps,
    showSkip,
    canGoBack,
    isCreateActivityVisible,
    back,
    handleSkip,
    handlePrimary,
    onActivityCreated,
    closeCreateActivity,
  } = useTutorialWizard({ complete, skip });

  const stepData = t(`steps.${currentStep}`, { returnObjects: true }) as {
    title: string;
    body: string;
    cta: string;
  };

  return (
    <>
      <Modal
        visible
        transparent
        animationType="fade"
        statusBarTranslucent
        accessibilityViewIsModal
      >
        <View
          className="flex-1 justify-center items-center p-6"
          style={{ backgroundColor: colors.modalOverlay }}
        >
          <View
            className="bg-white dark:bg-gray-800 rounded-2xl w-full p-6 gap-6"
            style={{
              maxWidth: 448,
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.16,
              shadowRadius: 48,
              elevation: 24,
            }}
          >
            {/* Step indicator */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row gap-1.5">
                {TUTORIAL_STEPS.map((stepKey, i) => (
                  <View
                    key={stepKey}
                    className={
                      i === currentIndex
                        ? "w-2 h-2 rounded-full bg-gray-900 dark:bg-gray-100"
                        : "w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"
                    }
                  />
                ))}
              </View>
              <Text className="text-xs text-gray-400 dark:text-gray-500">
                {t("stepIndicator", {
                  current: currentIndex + 1,
                  total: totalSteps,
                })}
              </Text>
            </View>

            {/* Content */}
            <View className="gap-3">
              <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {stepData.title}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {stepData.body}
              </Text>
            </View>

            {/* Buttons */}
            <View className="gap-3">
              <FormButton
                variant="primary"
                label={stepData.cta}
                onPress={handlePrimary}
              />
              <View className="flex-row justify-between items-center">
                {showSkip ? (
                  <TouchableOpacity
                    onPress={() => void handleSkip()}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={t("skip")}
                  >
                    <Text className="text-sm text-gray-400 dark:text-gray-500">
                      {t("skip")}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}
                <View className="flex-row gap-2">
                  {canGoBack && (
                    <TouchableOpacity
                      onPress={back}
                      activeOpacity={0.7}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600"
                      accessibilityRole="button"
                      accessibilityLabel={t("back")}
                    >
                      <Text className="text-sm text-gray-600 dark:text-gray-400">
                        {t("back")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <CreateActivityDialog
        visible={isCreateActivityVisible}
        onClose={closeCreateActivity}
        onCreated={onActivityCreated}
      />
    </>
  );
}
