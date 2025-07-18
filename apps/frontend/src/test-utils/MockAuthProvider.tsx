import { type ReactNode, createContext, useState } from "react";

import { vi } from "vitest";

import type { LoginRequest } from "@dtos/request/LoginRequest";
import type { GetUserResponse } from "@dtos/response/GetUserResponse";

type UserState = GetUserResponse | null;
type RequestStatus = "idle" | "loading";

type MockAuthState = {
  user: UserState;
  getUser: () => Promise<void>;
  login: ({ login_id, password }: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  requestStatus: RequestStatus;
  setUser: (user: UserState) => void;
  setAccessToken: (token: string | null) => void;
  scheduleTokenRefresh: (expiresIn?: number) => void;
  isInitialized: boolean;
};

export const createMockAuthContext = (
  overrides?: Partial<MockAuthState>,
): MockAuthState => ({
  user: null,
  getUser: vi.fn().mockResolvedValue(undefined),
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  refreshToken: vi.fn().mockResolvedValue(undefined),
  requestStatus: "idle",
  setUser: vi.fn(),
  setAccessToken: vi.fn(),
  scheduleTokenRefresh: vi.fn(),
  isInitialized: true,
  ...overrides,
});

export const MockAuthContext = createContext<MockAuthState | undefined>(
  undefined,
);

type MockAuthProviderProps = {
  children: ReactNode;
  mockValue?: Partial<MockAuthState>;
};

export const MockAuthProvider: React.FC<MockAuthProviderProps> = ({
  children,
  mockValue = {},
}) => {
  const [user, setUser] = useState<UserState>(mockValue.user ?? null);
  const [requestStatus] = useState<RequestStatus>(
    mockValue.requestStatus ?? "idle",
  );

  const defaultMockValue = createMockAuthContext({
    user,
    setUser: (newUser) => {
      setUser(newUser);
      mockValue.setUser?.(newUser);
    },
    requestStatus,
    ...mockValue,
  });

  return (
    <MockAuthContext.Provider value={defaultMockValue}>
      {children}
    </MockAuthContext.Provider>
  );
};
