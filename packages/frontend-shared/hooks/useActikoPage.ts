import { summarizeLogsByActivity } from "./activityDaySummary";
import type {
  ActivityBase,
  ActivityLogBase,
  IconBlobBase,
  ReactHooks,
} from "./types";

/** useDailyPage が返す値のうち、この画面のグリッドが使う部分 */
type DayPageState = {
  activities: (ActivityBase & { deletedAt?: unknown })[];
  logs: ActivityLogBase[];
};

type UseActikoPageDeps<
  TDaily extends DayPageState,
  TIconBlob extends IconBlobBase,
> = {
  react: Pick<ReactHooks, "useState" | "useMemo">;
  /** 日付・その日のログ・タスクを持つフック。画面の日付状態はこれ 1 つに集約する */
  useDailyPage: () => TDaily;
  useIconBlobs: () => TIconBlob[] | undefined;
};

/**
 * Actiko 画面（記録グリッド + その日の記録 + その日のタスク）のフック。
 * 日付・ログ・タスクは useDailyPage をそのまま使い、グリッド固有の状態だけをここで足す。
 */
export function createUseActikoPage<
  TDaily extends DayPageState,
  TIconBlob extends IconBlobBase,
>(deps: UseActikoPageDeps<TDaily, TIconBlob>) {
  const {
    react: { useState, useMemo },
    useDailyPage,
    useIconBlobs,
  } = deps;

  type TActivity = TDaily["activities"][number];

  return function useActikoPage() {
    const daily = useDailyPage();
    const iconBlobs = useIconBlobs();

    const [selectedActivity, setSelectedActivity] = useState<TActivity | null>(
      null,
    );
    const [createActivityOpen, setCreateActivityOpen] = useState(false);
    const [editActivity, setEditActivity] = useState<TActivity | null>(null);
    const [reorderOpen, setReorderOpen] = useState(false);

    // useDailyPage は過去ログの表示用に削除済みアクティビティも返すので、グリッドには出さない
    const allActivities = daily.activities as TActivity[];
    const gridActivities = useMemo(
      () => allActivities.filter((a) => !a.deletedAt),
      [allActivities],
    );

    const iconBlobMap = useMemo(() => {
      const map = new Map<string, TIconBlob>();
      for (const blob of iconBlobs ?? []) {
        map.set(blob.activityId, blob);
      }
      return map;
    }, [iconBlobs]);

    const summaryByActivity = useMemo(
      () => summarizeLogsByActivity(daily.logs),
      [daily.logs],
    );

    return {
      ...daily,
      gridActivities,
      iconBlobMap,
      summaryByActivity,
      selectedActivity,
      setSelectedActivity,
      createActivityOpen,
      setCreateActivityOpen,
      editActivity,
      setEditActivity,
      reorderOpen,
      setReorderOpen,
    };
  };
}
