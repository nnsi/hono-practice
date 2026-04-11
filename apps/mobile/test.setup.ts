import { vi } from "vitest";

vi.mock("react-native", async () => {
  const actual = (await vi.importActual("react-native-web")) as {
    Platform: {
      OS: string;
      select: <T>(options: {
        default?: T;
        web?: T;
        native?: T;
        ios?: T;
        android?: T;
      }) => T | undefined;
    };
  } & Record<string, unknown>;

  return {
    ...actual,
    Platform: {
      ...actual.Platform,
      OS: "web",
      select: <T>(options: {
        default?: T;
        web?: T;
        native?: T;
        ios?: T;
        android?: T;
      }) =>
        options.web ??
        options.default ??
        options.native ??
        options.ios ??
        options.android,
    },
    AppState: {
      currentState: "active",
      addEventListener: vi.fn(() => ({
        remove: vi.fn(),
      })),
    },
    Appearance: {
      getColorScheme: vi.fn(() => "light"),
      addChangeListener: vi.fn(() => ({
        remove: vi.fn(),
      })),
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: vi.fn().mockResolvedValue(false),
      addEventListener: vi.fn(() => ({
        remove: vi.fn(),
      })),
    },
  };
});

vi.mock("expo-constants", () => ({
  default: {
    expoGoConfig: {
      debuggerHost: "localhost:8081",
    },
  },
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@react-native-community/netinfo", () => ({
  default: {
    fetch: vi.fn().mockResolvedValue({ isConnected: true }),
    addEventListener: vi.fn(() => () => {}),
  },
}));

vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: vi.fn(),
}));
