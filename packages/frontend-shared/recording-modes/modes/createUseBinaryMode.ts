import type {
  ReactHooks,
  RecordingModeProps,
  UseRecordingModeHook,
} from "../types";

type UseBinaryModeDeps = {
  react: Pick<ReactHooks, "useState">;
};

type KindTally = {
  id: string;
  name: string;
  color: string | null;
  count: number;
};

export type BinaryModeViewModel = {
  kindTallies: KindTally[];
  selectKind: (kindId: string) => void;
  hasKinds: boolean;
  isSubmitting: boolean;
};

function computeKindTallies(
  kinds: RecordingModeProps["kinds"],
  todayLogs: RecordingModeProps["todayLogs"],
): KindTally[] {
  const countMap = new Map<string, number>();
  if (todayLogs) {
    for (const log of todayLogs) {
      if (log.activityKindId) {
        countMap.set(
          log.activityKindId,
          (countMap.get(log.activityKindId) ?? 0) + (log.quantity ?? 1),
        );
      }
    }
  }
  return kinds.map((kind) => ({
    id: kind.id,
    name: kind.name,
    color: kind.color,
    count: countMap.get(kind.id) ?? 0,
  }));
}

export function createUseBinaryMode(
  deps: UseBinaryModeDeps,
): UseRecordingModeHook<"binary"> {
  return function useBinaryMode(
    props: RecordingModeProps,
  ): BinaryModeViewModel {
    const [isSubmitting, setIsSubmitting] = deps.react.useState(false);

    const kindTallies = computeKindTallies(props.kinds, props.todayLogs);

    const selectKind = (kindId: string) => {
      if (isSubmitting || props.isSubmitting) return;
      setIsSubmitting(true);
      props
        .onSave({
          quantity: 1,
          activityKindId: kindId,
          memo: "",
        })
        .finally(() => setIsSubmitting(false));
    };

    return {
      kindTallies,
      selectKind,
      hasKinds: props.kinds.length > 0,
      isSubmitting: isSubmitting || props.isSubmitting,
    };
  };
}
