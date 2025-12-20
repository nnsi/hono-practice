import type { ReactNode } from "react";
import { createContext, useContext } from "react";

import type { EventBus } from "@frontend/services/abstractions";
import { createWindowEventBus } from "@frontend/services/abstractions";

type EventBusContextValue = {
  eventBus: EventBus;
};

export const EventBusContext = createContext<EventBusContextValue | undefined>(
  undefined,
);

export type EventBusProviderProps = {
  children: ReactNode;
  eventBus?: EventBus;
};

export const EventBusProvider = ({
  children,
  eventBus = createWindowEventBus(),
}: EventBusProviderProps) => {
  return (
    <EventBusContext.Provider value={{ eventBus }}>
      {children}
    </EventBusContext.Provider>
  );
};

export const useEventBus = () => {
  const context = useContext(EventBusContext);
  if (!context) {
    throw new Error("useEventBus must be used within an EventBusProvider");
  }
  return context.eventBus;
};
