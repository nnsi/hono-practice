import { type ReactNode, createContext, useState } from "react";

import { vi } from "vitest";

type MockTokenState = {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  clearTokens: () => void;
  scheduleTokenRefresh: (expiresIn?: number) => void;
};

export const createMockTokenContext = (
  overrides?: Partial<MockTokenState>,
): MockTokenState => ({
  accessToken: null,
  setAccessToken: vi.fn(),
  clearTokens: vi.fn(),
  scheduleTokenRefresh: vi.fn(),
  ...overrides,
});

export const MockTokenContext = createContext<MockTokenState | undefined>(
  undefined,
);

type MockTokenProviderProps = {
  children: ReactNode;
  mockValue?: Partial<MockTokenState>;
};

export const MockTokenProvider: React.FC<MockTokenProviderProps> = ({
  children,
  mockValue = {},
}) => {
  const [accessToken, setAccessTokenState] = useState<string | null>(
    mockValue.accessToken ?? null,
  );

  const defaultMockValue = createMockTokenContext({
    accessToken,
    setAccessToken: (token) => {
      setAccessTokenState(token);
      mockValue.setAccessToken?.(token);
    },
    ...mockValue,
  });

  return (
    <MockTokenContext.Provider value={defaultMockValue}>
      {children}
    </MockTokenContext.Provider>
  );
};
