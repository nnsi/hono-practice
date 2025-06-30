import { createContext, useState } from "react";

type DateState = {
  date: Date;
  setDate: (date: Date) => void;
};

export const DateContext = createContext<DateState>({
  date: new Date(),
  setDate: () => {},
});

export const DateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [date, setDate] = useState<Date>(new Date());

  return (
    <DateContext.Provider value={{ date, setDate }}>
      {children}
    </DateContext.Provider>
  );
};
