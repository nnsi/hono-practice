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
    // 連続発火で複数の query() が in-flight になった場合に、遅れて resolve した
    // 古い実行が新しい実行の結果を上書きしないようにするための単調増加トークン（BUG-10）。
    let latestSeq = 0;
    const run = () => {
      const seq = ++latestSeq;
      queryRef
        .current()
        .then((result) => {
          if (!cancelled && seq === latestSeq) setData(result);
        })
        .catch((err: unknown) => {
          if (cancelled || seq !== latestSeq) return;
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
