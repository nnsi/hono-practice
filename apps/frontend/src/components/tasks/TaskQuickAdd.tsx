import { useRef } from "react";

import { useTranslation } from "@packages/i18n";
import { VALIDATION } from "@packages/types/validation";

import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { useTaskQuickAdd } from "./useTaskQuickAdd";

export function TaskQuickAdd({ defaultDate }: { defaultDate?: string }) {
  const { t } = useTranslation("task");
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const { title, setTitle, isSubmitting, hasError, canSubmit, submit } =
    useTaskQuickAdd(defaultDate);

  return (
    <form
      aria-label={t("quickAdd.label")}
      className="space-y-2 mb-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (composing.current) return;
        if (await submit()) inputRef.current?.focus();
      }}
    >
      <div className="flex items-center gap-2">
        <FormInput
          ref={inputRef}
          aria-label={t("quickAdd.label")}
          placeholder={t("quickAdd.placeholder")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          readOnly={isSubmitting}
          maxLength={VALIDATION.TASK_TITLE_MAX}
          className="min-w-0 flex-1"
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              (event.nativeEvent.isComposing ||
                event.keyCode === 229 ||
                composing.current)
            ) {
              event.preventDefault();
            }
          }}
        />
        <FormButton
          type="submit"
          variant="primary"
          label={t("quickAdd.submit")}
          disabled={!canSubmit}
          className="shrink-0 px-4"
        />
      </div>
      {hasError && (
        <p role="alert" className="text-sm text-red-600">
          {t("quickAdd.error")}
        </p>
      )}
    </form>
  );
}
