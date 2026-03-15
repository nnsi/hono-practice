import { useEffect, useRef, useState } from "react";

import { reportError } from "../utils/errorReporter";
import { dbEvents } from "./dbEvents";

export function useLiveQuery<T>(
  tables: string | string[],
  query: () => Promise<T>,
  deps: unknown[] = [],
): T | undefined {
  const [data, setData] = useState<T>();
  const queryRef = useRef(query);
  queryRef.current = query;

  const stableTables = Array.isArray(tables) ? tables.join(",") : tables;

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      queryRef
        .current()
        .then((result) => {
          if (!cancelled) setData(result);
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          const stack = err instanceof Error ? err.stack : undefined;
          reportError({ errorType: "db_query_error", message, stack });
        });
    };
    run();
    const unsub = dbEvents.subscribe(stableTables.split(","), run);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [stableTables, ...deps]);

  return data;
}
