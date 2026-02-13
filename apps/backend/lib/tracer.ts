export type SpanData = {
  name: string;
  duration: number;
};

export type TracerSummary = {
  dbMs: number;
  r2Ms: number;
  kvMs: number;
  extMs: number;
  spanCount: number;
};

export type Tracer = {
  /** async関数をラップして自動計測 */
  span: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
  /** ストリーミング等で手動記録が必要な場合用 */
  addSpan: (name: string, duration: number) => void;
  /** カテゴリ別の合計を返す（db./r2./kv./ext. プレフィックスで分類） */
  getSummary: () => TracerSummary;
};

export const createTracer = (): Tracer => {
  const spans: SpanData[] = [];

  return {
    span: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      const start = performance.now();
      try {
        return await fn();
      } finally {
        spans.push({ name, duration: performance.now() - start });
      }
    },

    addSpan: (name: string, duration: number) => {
      spans.push({ name, duration });
    },

    getSummary: () => {
      let dbMs = 0;
      let r2Ms = 0;
      let kvMs = 0;
      let extMs = 0;

      for (const s of spans) {
        if (s.name.startsWith("db.")) dbMs += s.duration;
        else if (s.name.startsWith("r2.")) r2Ms += s.duration;
        else if (s.name.startsWith("kv.")) kvMs += s.duration;
        else if (s.name.startsWith("ext.")) extMs += s.duration;
      }

      return {
        dbMs: Math.round(dbMs),
        r2Ms: Math.round(r2Ms),
        kvMs: Math.round(kvMs),
        extMs: Math.round(extMs),
        spanCount: spans.length,
      };
    },
  };
};

/** テスト用のno-op tracer */
export const noopTracer: Tracer = {
  span: async <T>(_name: string, fn: () => Promise<T>): Promise<T> => fn(),
  addSpan: () => {},
  getSummary: () => ({ dbMs: 0, r2Ms: 0, kvMs: 0, extMs: 0, spanCount: 0 }),
};
