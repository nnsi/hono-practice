import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import { createBrowserTimeProvider } from "@frontend/services/abstractions";

import type { TimeProvider } from "@frontend/services/abstractions";

type TimeProviderContextValue = {
  timeProvider: TimeProvider;
};

const TimeProviderContext = createContext<TimeProviderContextValue | undefined>(
  undefined,
);

export type TimeProviderProps = {
  children: ReactNode;
  timeProvider?: TimeProvider;
};

export const TimeProviderComponent = ({
  children,
  timeProvider = createBrowserTimeProvider(),
}: TimeProviderProps) => {
  return (
    <TimeProviderContext.Provider value={{ timeProvider }}>
      {children}
    </TimeProviderContext.Provider>
  );
};

export const useTimeProvider = () => {
  const context = useContext(TimeProviderContext);
  if (!context) {
    throw new Error("useTimeProvider must be used within a TimeProvider");
  }
  return context.timeProvider;
};
