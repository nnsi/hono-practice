const listeners = new Map<string, Set<() => void>>();

export const dbEvents = {
  emit(table: string) {
    listeners.get(table)?.forEach((fn) => fn());
  },
  subscribe(tables: string | string[], fn: () => void) {
    const tableList = Array.isArray(tables) ? tables : [tables];
    for (const table of tableList) {
      if (!listeners.has(table)) listeners.set(table, new Set());
      listeners.get(table)!.add(fn);
    }
    return () => {
      for (const table of tableList) {
        listeners.get(table)?.delete(fn);
      }
    };
  },
};
