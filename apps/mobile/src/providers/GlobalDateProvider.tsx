import type React from "react";
import { createContext, useContext, useState } from "react";

type GlobalDateContextType = {
  date: Date;
  setDate: (date: Date) => void;
};

const GlobalDateContext = createContext<GlobalDateContextType | undefined>(
  undefined,
);

export const GlobalDateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [date, setDate] = useState<Date>(new Date());

  return (
    <GlobalDateContext.Provider value={{ date, setDate }}>
      {children}
    </GlobalDateContext.Provider>
  );
};

export const useGlobalDateContext = () => {
  const context = useContext(GlobalDateContext);
  if (!context) {
    throw new Error(
      "useGlobalDateContext must be used within a GlobalDateProvider",
    );
  }
  return context;
};
