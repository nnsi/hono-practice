import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseQuery = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );

  return {
    ...actual,
    useQuery: mockUseQuery,
  };
});

import { DashboardPage } from "./DashboardPage";

type DashboardData = {
  totalUsers: number;
  totalContacts: number;
  recentActionCount: number;
  premiumUsers: number;
  apm: {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    badRequestCount: number;
    avgResponseTimeMs: number;
  };
  clientErrors: {
    web: number;
    ios: number;
    android: number;
  };
};

const emptyQueryResult = {
  data: [],
  isLoading: false,
  isError: false,
};

describe("DashboardPage", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("shows skeletons while loading", () => {
    mockUseQuery.mockImplementation(
      (options: { queryKey: readonly unknown[] }) => {
        if (options.queryKey[1] === "dashboard") {
          return {
            data: undefined,
            isLoading: true,
            isError: false,
          };
        }

        return emptyQueryResult;
      },
    );

    const { container } = render(<DashboardPage />);

    expect(
      container.querySelectorAll(".animate-pulse").length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("shows an explicit error state when the dashboard query fails", () => {
    mockUseQuery.mockImplementation(
      (options: { queryKey: readonly unknown[] }) => {
        if (options.queryKey[1] === "dashboard") {
          return {
            data: undefined,
            isLoading: false,
            isError: true,
            error: new Error("API error: 500"),
          };
        }

        return emptyQueryResult;
      },
    );

    render(<DashboardPage />);

    expect(screen.getByText("ダッシュボードの取得に失敗しました")).toBeTruthy();
  });

  it("renders the empty dashboard state", () => {
    const dashboardData: DashboardData = {
      totalUsers: 0,
      totalContacts: 0,
      recentActionCount: 0,
      premiumUsers: 0,
      apm: {
        totalRequests: 0,
        errorCount: 0,
        errorRate: 0,
        badRequestCount: 0,
        avgResponseTimeMs: 0,
      },
      clientErrors: {
        web: 0,
        ios: 0,
        android: 0,
      },
    };

    mockUseQuery.mockImplementation(
      (options: { queryKey: readonly unknown[] }) => {
        if (options.queryKey[1] === "dashboard") {
          return {
            data: dashboardData,
            isLoading: false,
            isError: false,
          };
        }

        return emptyQueryResult;
      },
    );

    render(<DashboardPage />);

    expect(
      screen.getByText("CF_WORKERS_TOKEN未設定、またはデータなし"),
    ).toBeTruthy();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });
});
