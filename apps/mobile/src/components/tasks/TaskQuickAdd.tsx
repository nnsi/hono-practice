import { useRef } from "react";

import { useTranslation } from "@packages/i18n";
import { VALIDATION } from "@packages/types/validation";
import { Text, type TextInput, View } from "react-native";

import { mobileTestIds } from "../../testing/testIds";
import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { useTaskQuickAdd } from "./useTaskQuickAdd";

export function TaskQuickAdd({ defaultDate }: { defaultDate?: string }) {
  const { t } = useTranslation("task");
  const inputRef = useRef<TextInput>(null);
  const { title, setTitle, isSubmitting, hasError, canSubmit, submit } =
    useTaskQuickAdd(defaultDate);
  const handleSubmit = async () => {
    if (await submit()) {
      // FormInput keeps native IME text uncontrolled, so clear it explicitly.
      inputRef.current?.clear();
      inputRef.current?.focus();
    }
  };

  return (
    <View className="gap-2 mb-3">
      <View className="flex-row items-center gap-2">
        <FormInput
          ref={inputRef}
          value={title}
          onChangeText={setTitle}
          editable={!isSubmitting}
          placeholder={t("quickAdd.placeholder")}
          accessibilityLabel={t("quickAdd.label")}
          testID={mobileTestIds.taskQuickAdd.titleInput}
          maxLength={VALIDATION.TASK_TITLE_MAX}
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={handleSubmit}
          className="flex-1 min-w-0"
        />
        <FormButton
          variant="primary"
          label={t("quickAdd.submit")}
          onPress={handleSubmit}
          disabled={!canSubmit}
          testID={mobileTestIds.taskQuickAdd.submitButton}
          className="px-4"
        />
      </View>
      {hasError && (
        <Text
          accessibilityRole="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {t("quickAdd.error")}
        </Text>
      )}
    </View>
  );
}
