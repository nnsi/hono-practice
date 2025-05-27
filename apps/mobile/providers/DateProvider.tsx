import type React from "react";
import { type ReactNode, createContext, useContext, useState } from "react";

type DateContextType = {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  formatDate: (date: Date) => string;
};

const DateContext = createContext<DateContextType | undefined>(undefined);

export const DateProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return (
    <DateContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        formatDate,
      }}
    >
      {children}
    </DateContext.Provider>
  );
};

export const useDate = () => {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error("useDate must be used within a DateProvider");
  }
  return context;
};
