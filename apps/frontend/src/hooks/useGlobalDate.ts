import { createEventBusAdapter } from "@frontend/adapters/EventBusAdapter";
import { useEventBus } from "@frontend/providers/EventBusProvider";
import { createUseGlobalDate } from "@packages/frontend-shared/hooks";

export const useGlobalDate = () => {
  const eventBus = useEventBus();
  const eventBusAdapter = createEventBusAdapter(eventBus);
  return createUseGlobalDate({ eventBus: eventBusAdapter });
};
