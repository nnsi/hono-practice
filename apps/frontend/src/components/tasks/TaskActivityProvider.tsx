import { type ReactNode, createContext, useContext, useMemo } from "react";

import { useLiveQuery } from "dexie-react-hooks";

import { db } from "../../db/schema";
import { useActivities } from "../../hooks/useActivities";

function useTaskActivities() {
  const { activities } = useActivities();
  const kinds = useLiveQuery(() => db.activityKinds.toArray(), []);
  const activityMap = useMemo(
    () => new Map(activities.map((activity) => [activity.id, activity])),
    [activities],
  );
  const kindMap = useMemo(
    () => new Map((kinds ?? []).map((kind) => [kind.id, kind])),
    [kinds],
  );
  return useMemo(() => ({ activityMap, kindMap }), [activityMap, kindMap]);
}

const TaskActivityContext = createContext<ReturnType<
  typeof useTaskActivities
> | null>(null);

/** Share queries across task cards and schedule rows, including hidden tabs. */
export function TaskActivityProvider({ children }: { children: ReactNode }) {
  const value = useTaskActivities();
  return (
    <TaskActivityContext.Provider value={value}>
      {children}
    </TaskActivityContext.Provider>
  );
}

export function useTaskActivityData() {
  const value = useContext(TaskActivityContext);
  if (!value) throw new Error("TaskActivityProvider is required");
  return value;
}
