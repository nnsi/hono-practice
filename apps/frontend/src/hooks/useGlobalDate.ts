import { useContext } from "react";

import { DateContext } from "@frontend/providers/DateProvider";

export const useGlobalDate = () => {
  const context = useContext(DateContext);
  if (!context) {
    throw new Error("useGlobalDate must be used within a DateProvider");
  }

  return context;
};
