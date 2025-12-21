import type { ReactNode } from "react";
import { createContext, useContext } from "react";

import type { StorageProvider } from "@frontend/services/abstractions";
import { createLocalStorageProvider } from "@frontend/services/abstractions";

type StorageContextValue = {
  storage: StorageProvider;
};

const StorageContext = createContext<StorageContextValue | undefined>(
  undefined,
);

export type StorageProviderProps = {
  children: ReactNode;
  storage?: StorageProvider;
};

export const StorageProviderComponent = ({
  children,
  storage = createLocalStorageProvider(),
}: StorageProviderProps) => {
  return (
    <StorageContext.Provider value={{ storage }}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error("useStorage must be used within a StorageProvider");
  }
  return context.storage;
};
