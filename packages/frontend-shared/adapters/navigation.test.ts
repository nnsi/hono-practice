import { describe, expect, it, vi } from "vitest";

import {
  createReactNativeNavigationAdapter,
  createWebNavigationAdapter,
} from "./index";

describe("NavigationAdapter", () => {
  describe("Web NavigationAdapter", () => {
    it("should navigate to a path", () => {
      const mockNavigate = vi.fn();
      const mockRouter = {
        navigate: mockNavigate,
        history: {
          replace: vi.fn(),
          back: vi.fn(),
          canGoBack: vi.fn(),
        },
      };

      const adapter = createWebNavigationAdapter(mockRouter);
      adapter.navigate("/home", { id: "123" });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/home",
        params: { id: "123" },
      });
    });

    it("should replace current route", () => {
      const mockReplace = vi.fn();
      const mockRouter = {
        navigate: vi.fn(),
        history: {
          replace: mockReplace,
          back: vi.fn(),
          canGoBack: vi.fn(),
        },
      };

      const adapter = createWebNavigationAdapter(mockRouter);
      adapter.replace("/login");

      expect(mockReplace).toHaveBeenCalledWith({
        to: "/login",
        params: undefined,
      });
    });

    it("should go back", () => {
      const mockBack = vi.fn();
      const mockRouter = {
        navigate: vi.fn(),
        history: {
          replace: vi.fn(),
          back: mockBack,
          canGoBack: vi.fn(),
        },
      };

      const adapter = createWebNavigationAdapter(mockRouter);
      adapter.goBack();

      expect(mockBack).toHaveBeenCalled();
    });

    it("should check if can go back", () => {
      const mockCanGoBack = vi.fn().mockReturnValue(true);
      const mockRouter = {
        navigate: vi.fn(),
        history: {
          replace: vi.fn(),
          back: vi.fn(),
          canGoBack: mockCanGoBack,
        },
      };

      const adapter = createWebNavigationAdapter(mockRouter);
      const result = adapter.canGoBack?.();

      expect(mockCanGoBack).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should get params from state", () => {
      const mockRouter = {
        navigate: vi.fn(),
        history: {
          replace: vi.fn(),
          back: vi.fn(),
          canGoBack: vi.fn(),
        },
        state: {
          location: {
            state: { userId: "123", role: "admin" },
          },
        },
      };

      const adapter = createWebNavigationAdapter(mockRouter);
      const params = adapter.getParams?.();

      expect(params).toEqual({ userId: "123", role: "admin" });
    });

    it("should warn when setParams is called", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      const mockRouter = {
        navigate: vi.fn(),
        history: {
          replace: vi.fn(),
          back: vi.fn(),
          canGoBack: vi.fn(),
        },
      };

      const adapter = createWebNavigationAdapter(mockRouter);
      adapter.setParams?.({ test: "value" });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "setParams is not directly supported in web navigation. Use navigate or replace with params instead.",
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe("React Native NavigationAdapter", () => {
    it("should navigate to a screen", () => {
      const mockNavigate = vi.fn();
      const mockNavigation = {
        navigate: mockNavigate,
        replace: vi.fn(),
        goBack: vi.fn(),
        canGoBack: vi.fn(),
        setParams: vi.fn(),
      };

      const adapter = createReactNativeNavigationAdapter(mockNavigation);
      adapter.navigate("HomeScreen", { id: "123" });

      expect(mockNavigate).toHaveBeenCalledWith("HomeScreen", { id: "123" });
    });

    it("should replace current screen", () => {
      const mockReplace = vi.fn();
      const mockNavigation = {
        navigate: vi.fn(),
        replace: mockReplace,
        goBack: vi.fn(),
        canGoBack: vi.fn(),
        setParams: vi.fn(),
      };

      const adapter = createReactNativeNavigationAdapter(mockNavigation);
      adapter.replace("LoginScreen");

      expect(mockReplace).toHaveBeenCalledWith("LoginScreen", undefined);
    });

    it("should go back", () => {
      const mockGoBack = vi.fn();
      const mockNavigation = {
        navigate: vi.fn(),
        replace: vi.fn(),
        goBack: mockGoBack,
        canGoBack: vi.fn(),
        setParams: vi.fn(),
      };

      const adapter = createReactNativeNavigationAdapter(mockNavigation);
      adapter.goBack();

      expect(mockGoBack).toHaveBeenCalled();
    });

    it("should check if can go back", () => {
      const mockCanGoBack = vi.fn().mockReturnValue(true);
      const mockNavigation = {
        navigate: vi.fn(),
        replace: vi.fn(),
        goBack: vi.fn(),
        canGoBack: mockCanGoBack,
        setParams: vi.fn(),
      };

      const adapter = createReactNativeNavigationAdapter(mockNavigation);
      const result = adapter.canGoBack?.();

      expect(mockCanGoBack).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should get params from current route", () => {
      const mockNavigation = {
        navigate: vi.fn(),
        replace: vi.fn(),
        goBack: vi.fn(),
        canGoBack: vi.fn(),
        setParams: vi.fn(),
        getState: vi.fn().mockReturnValue({
          routes: [
            { params: { id: "1" } },
            { params: { userId: "123", role: "admin" } },
          ],
        }),
      };

      const adapter = createReactNativeNavigationAdapter(mockNavigation);
      const params = adapter.getParams?.();

      expect(params).toEqual({ userId: "123", role: "admin" });
    });

    it("should return empty params when getState is not available", () => {
      const mockNavigation = {
        navigate: vi.fn(),
        replace: vi.fn(),
        goBack: vi.fn(),
        canGoBack: vi.fn(),
        setParams: vi.fn(),
      };

      const adapter = createReactNativeNavigationAdapter(mockNavigation);
      const params = adapter.getParams?.();

      expect(params).toEqual({});
    });

    it("should set params", () => {
      const mockSetParams = vi.fn();
      const mockNavigation = {
        navigate: vi.fn(),
        replace: vi.fn(),
        goBack: vi.fn(),
        canGoBack: vi.fn(),
        setParams: mockSetParams,
      };

      const adapter = createReactNativeNavigationAdapter(mockNavigation);
      adapter.setParams?.({ newParam: "value" });

      expect(mockSetParams).toHaveBeenCalledWith({ newParam: "value" });
    });
  });
});
