import type { ReactHooks, RecordingModeProps } from "../types";

type UseCheckModeDeps = {
  react: Pick<ReactHooks, "useState">;
};

export type CheckModeViewModel = {
  isCheckedToday: boolean;
  check: () => void;
  isSubmitting: boolean;
};

export function createUseCheckMode(deps: UseCheckModeDeps) {
  return function useCheckMode(props: RecordingModeProps): CheckModeViewModel {
    const [isSubmitting, setIsSubmitting] = deps.react.useState(false);

    const isCheckedToday = (props.todayLogs?.length ?? 0) > 0;

    const check = () => {
      if (isSubmitting || props.isSubmitting) return;
      setIsSubmitting(true);
      props
        .onSave({
          quantity: 1,
          activityKindId: null,
          memo: "",
        })
        .finally(() => setIsSubmitting(false));
    };

    return {
      isCheckedToday,
      check,
      isSubmitting: isSubmitting || props.isSubmitting,
    };
  };
}
