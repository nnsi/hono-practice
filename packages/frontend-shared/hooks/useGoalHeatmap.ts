import {
  type HeatmapCell,
  generateHeatmapData,
} from "@packages/domain/goal/goalHeatmap";
import dayjs from "dayjs";

import type { ActivityLogBase, Goal, ReactHooks } from "./types";

type UseGoalHeatmapDeps = {
  react: Pick<ReactHooks, "useMemo">;
  useGoals: () => { goals: Goal[] };
  useActivityLogsBetween: (
    activityIds: string[],
    start: string,
    end: string,
  ) => ActivityLogBase[] | undefined;
};

/** GitHubスタイルのグリッド用スロット */
export type HeatmapSlot = {
  key: string;
  cell: HeatmapCell | null;
  isToday: boolean;
};

/** 7行（月〜日）× N列（週）のグリッド */
export type HeatmapGrid = {
  columns: Array<{
    key: string;
    slots: [
      HeatmapSlot,
      HeatmapSlot,
      HeatmapSlot,
      HeatmapSlot,
      HeatmapSlot,
      HeatmapSlot,
      HeatmapSlot,
    ];
  }>;
  dayLabels: string[];
  startLabel: string;
  endLabel: string;
};

export type GoalHeatmapViewModel = {
  grid: HeatmapGrid;
  isLoading: boolean;
};

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

/**
 * 直近30日分のセルを7行(曜日)×N列(週)のGitHubスタイルグリッドに配置。
 * 月曜始まり。左端の列は最も古い週、右端が今週。
 */
function buildGrid(cells: HeatmapCell[], today: string): HeatmapGrid {
  const cellMap = new Map(cells.map((c) => [c.date, c]));
  const todayDayjs = dayjs(today);

  // 30日前の月曜日から始める（グリッドが月曜始まりで揃うように）
  const rawStart = todayDayjs.subtract(119, "day");
  const startDow = rawStart.day(); // 0=日, 1=月...6=土
  const mondayOffset = startDow === 0 ? 6 : startDow - 1;
  const gridStart = rawStart.subtract(mondayOffset, "day");

  // gridStartから今週の日曜まで
  const endDow = todayDayjs.day();
  const sundayOffset = endDow === 0 ? 0 : 7 - endDow;
  const gridEnd = todayDayjs.add(sundayOffset, "day");

  const totalDays = gridEnd.diff(gridStart, "day") + 1;
  const numWeeks = totalDays / 7;

  const columns: HeatmapGrid["columns"] = [];
  for (let w = 0; w < numWeeks; w++) {
    const slots: HeatmapSlot[] = [];
    for (let d = 0; d < 7; d++) {
      const date = gridStart.add(w * 7 + d, "day");
      const dateStr = date.format("YYYY-MM-DD");
      const isInRange =
        dateStr >= rawStart.format("YYYY-MM-DD") && dateStr <= today;
      slots.push({
        key: dateStr,
        cell: isInRange ? (cellMap.get(dateStr) ?? null) : null,
        isToday: dateStr === today,
      });
    }
    columns.push({
      key: `w-${gridStart.add(w * 7, "day").format("YYYY-MM-DD")}`,
      slots: slots as HeatmapGrid["columns"][number]["slots"],
    });
  }

  return {
    columns,
    dayLabels: DAY_LABELS,
    startLabel: rawStart.format("M/D"),
    endLabel: todayDayjs.format("M/D"),
  };
}

export function createUseGoalHeatmap(deps: UseGoalHeatmapDeps) {
  const {
    react: { useMemo },
    useGoals,
    useActivityLogsBetween,
  } = deps;

  return function useGoalHeatmap(): GoalHeatmapViewModel {
    const today = dayjs().format("YYYY-MM-DD");
    const start = dayjs().subtract(119, "day").format("YYYY-MM-DD");

    const { goals } = useGoals();

    // 表示期間と重なるゴール（終了済み含む）
    const relevantGoals = useMemo(
      () =>
        goals.filter(
          (g) =>
            g.startDate <= today && (g.endDate === null || g.endDate >= start),
        ),
      [goals, today, start],
    );

    const activityIds = useMemo(
      () => [...new Set(relevantGoals.map((g) => g.activityId))],
      [relevantGoals],
    );

    const logs = useActivityLogsBetween(activityIds, start, today);

    const cells = useMemo(() => {
      if (!logs) return [];

      const logsByActivityId = new Map<
        string,
        Array<{ date: string; quantity: number | null }>
      >();
      for (const log of logs) {
        const list = logsByActivityId.get(log.activityId);
        if (list) {
          list.push(log);
        } else {
          logsByActivityId.set(log.activityId, [log]);
        }
      }

      return generateHeatmapData(
        relevantGoals,
        logsByActivityId,
        { start, end: today },
        today,
      );
    }, [logs, relevantGoals, start, today]);

    const grid = useMemo(() => buildGrid(cells, today), [cells, today]);

    return {
      grid,
      isLoading: !logs,
    };
  };
}
