import { ReactElement, createContext, useState } from "react";

import { useRouterState } from "@tanstack/react-router";

type AuthState = {
  test: string;
};

export const AuthContext = createContext<AuthState>({
  test: "test",
});

export const AuthProvider: React.FC<{ children: ReactElement }> = ({
  children,
}) => {
  const routerState = useRouterState();
  const [authState, setAuthState] = useState<AuthState>({
    test: "test",
  });

  if (routerState.location.pathname === "/about") {
    setAuthState({
      test: "about",
    });
  }

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
};
