import type { ReactHooks, RecordingModeProps } from "../types";

type UseCheckModeDeps = {
  react: Pick<ReactHooks, "useState">;
};

export type CheckKindItem = {
  id: string;
  name: string;
  color: string | null;
  isCheckedToday: boolean;
};

export type CheckModeViewModel = {
  /** Kindなしモード: 当日記録済みか */
  isCheckedToday: boolean;
  /** Kind一覧（チェック済み状態付き） */
  kindItems: CheckKindItem[];
  /** Kindが存在するか */
  hasKinds: boolean;
  /** 選択中のKind ID */
  selectedKindId: string | null;
  /** Kind選択 */
  selectKind: (kindId: string) => void;
  /** チェック実行可能か */
  canCheck: boolean;
  /** チェック実行 */
  check: () => void;
  isSubmitting: boolean;
};

function buildKindItems(
  kinds: RecordingModeProps["kinds"],
  todayLogs: RecordingModeProps["todayLogs"],
): CheckKindItem[] {
  const checkedKindIds = new Set<string>();
  if (todayLogs) {
    for (const log of todayLogs) {
      if (log.activityKindId) {
        checkedKindIds.add(log.activityKindId);
      }
    }
  }
  return kinds.map((kind) => ({
    id: kind.id,
    name: kind.name,
    color: kind.color,
    isCheckedToday: checkedKindIds.has(kind.id),
  }));
}

export function createUseCheckMode(deps: UseCheckModeDeps) {
  return function useCheckMode(props: RecordingModeProps): CheckModeViewModel {
    const [isSubmitting, setIsSubmitting] = deps.react.useState(false);
    const [selectedKindId, setSelectedKindId] = deps.react.useState<
      string | null
    >(null);

    const hasKinds = props.kinds.length > 0;
    const kindItems = buildKindItems(props.kinds, props.todayLogs);
    const isCheckedToday = (props.todayLogs?.length ?? 0) > 0;

    const selectedKindItem = kindItems.find((k) => k.id === selectedKindId);
    const canCheck = hasKinds
      ? selectedKindId !== null &&
        selectedKindItem !== undefined &&
        !selectedKindItem.isCheckedToday
      : !isCheckedToday;

    const selectKind = (kindId: string) => {
      setSelectedKindId(kindId);
    };

    const check = () => {
      if (isSubmitting || props.isSubmitting || !canCheck) return;
      setIsSubmitting(true);
      props
        .onSave({
          quantity: 1,
          activityKindId: hasKinds ? selectedKindId : null,
          memo: "",
        })
        .finally(() => {
          setIsSubmitting(false);
          if (hasKinds) setSelectedKindId(null);
        });
    };

    return {
      isCheckedToday,
      kindItems,
      hasKinds,
      selectedKindId,
      selectKind,
      canCheck,
      check,
      isSubmitting: isSubmitting || props.isSubmitting,
    };
  };
}
