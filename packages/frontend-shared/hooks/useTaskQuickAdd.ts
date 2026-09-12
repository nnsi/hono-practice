import { getToday } from "../utils/dateUtils";
import type { ReactHooks } from "./types";
import { isValidTaskTitle } from "./useTaskCreateDialog";

type Deps = {
  react: Pick<ReactHooks, "useState">;
  taskRepository: {
    createTask: (data: {
      title: string;
      startDate: string;
      dueDate: null;
      activityId: null;
      activityKindId: null;
      quantity: null;
      memo: string;
    }) => Promise<unknown>;
  };
  syncEngine: { syncTasks: () => Promise<void> };
  onError: (error: unknown) => void;
};

export function createUseTaskQuickAdd({
  react: { useState },
  taskRepository,
  syncEngine,
  onError,
}: Deps) {
  return function useTaskQuickAdd(defaultDate?: string) {
    const [title, setTitle] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasError, setHasError] = useState(false);
    // Lock immediately, including a second submit before React re-renders.
    const [submission] = useState(() => ({ pending: false }));
    const canSubmit = !isSubmitting && isValidTaskTitle(title);

    const submit = async (): Promise<boolean> => {
      if (submission.pending || !isValidTaskTitle(title)) return false;
      submission.pending = true;
      setIsSubmitting(true);
      setHasError(false);
      try {
        await taskRepository.createTask({
          title: title.trim(),
          startDate: defaultDate ?? getToday(),
          dueDate: null,
          activityId: null,
          activityKindId: null,
          quantity: null,
          memo: "",
        });
      } catch (error) {
        setHasError(true);
        onError(error);
        return false;
      } finally {
        submission.pending = false;
        setIsSubmitting(false);
      }
      setTitle("");
      // Local persistence completes creation; background sync can retry later.
      void syncEngine.syncTasks().catch(onError);
      return true;
    };

    return { title, setTitle, isSubmitting, hasError, canSubmit, submit };
  };
}
