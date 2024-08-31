import { createContext, useState } from "react";


type AuthState = {
  test: string;
};

export const AuthContext = createContext<AuthState>({
  test: "test",
});

export function useAuth(){
  const [authState] = useState<AuthState>({
    test: "test",
  });

  return {state:authState}
};
