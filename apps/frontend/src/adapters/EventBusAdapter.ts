import type { EventBus } from "@frontend/services/abstractions";
import type { EventBusAdapter } from "@packages/frontend-shared/adapters";

export function createEventBusAdapter(eventBus: EventBus): EventBusAdapter {
  // EventBusのonメソッドの戻り値（unsubscribe関数）を管理するため
  const handlerMap = new Map<(...args: any[]) => void, () => void>();

  return {
    emit: (eventName, data) => {
      eventBus.emit(eventName, data);
    },
    on: (eventName, handler) => {
      const unsubscribe = eventBus.on(eventName, handler);
      handlerMap.set(handler, unsubscribe);
      return unsubscribe;
    },
    off: (_eventName, handler) => {
      const unsubscribe = handlerMap.get(handler);
      if (unsubscribe) {
        unsubscribe();
        handlerMap.delete(handler);
      }
    },
  };
}
