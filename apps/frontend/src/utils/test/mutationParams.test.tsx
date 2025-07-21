import type { ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { mp } from "../mutationParams";

describe("mp (mutationParams)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("mutationFnとonSuccessを含むオブジェクトを返す", () => {
    const { result } = renderHook(
      () =>
        mp({
          queryKey: ["test"],
          mutationFn: vi.fn(),
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current).toHaveProperty("mutationFn");
    expect(result.current).toHaveProperty("onSuccess");
    expect(typeof result.current.mutationFn).toBe("function");
    expect(typeof result.current.onSuccess).toBe("function");
  });

  it("mutationFnがレスポンスを正しく処理する", async () => {
    const mockData = { id: "123", message: "Success" };
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockData),
    };
    const mockMutationFn = vi.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () =>
        mp({
          queryKey: ["test"],
          mutationFn: mockMutationFn,
        }),
      { wrapper: createWrapper() },
    );

    const data = await result.current.mutationFn(undefined);

    expect(mockMutationFn).toHaveBeenCalledWith(undefined);
    expect(data).toEqual(mockData);
  });

  it("リクエストスキーマで検証を行う", async () => {
    const requestSchema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
    });

    const mockMutationFn = vi.fn();

    const { result } = renderHook(
      () =>
        mp({
          queryKey: ["test"],
          mutationFn: mockMutationFn,
          requestSchema,
        }),
      { wrapper: createWrapper() },
    );

    // 無効なデータでエラーが発生することを確認
    await expect(
      result.current.mutationFn({ name: "", age: -1 }),
    ).rejects.toThrow();

    // mutationFnが呼ばれていないことを確認
    expect(mockMutationFn).not.toHaveBeenCalled();
  });

  it("レスポンススキーマで検証を行う", async () => {
    const responseSchema = z.object({
      id: z.string(),
      status: z.enum(["success", "error"]),
    });

    const invalidData = { id: 123, status: "invalid" }; // 無効なデータ
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(invalidData),
    };
    const mockMutationFn = vi.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () =>
        mp({
          queryKey: ["test"],
          mutationFn: mockMutationFn,
          responseSchema,
        }),
      { wrapper: createWrapper() },
    );

    await expect(result.current.mutationFn(undefined)).rejects.toThrow();
  });

  it("onSuccessがqueryKeyを無効化する", async () => {
    const queryKey = ["test", "data"];
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () =>
        mp({
          queryKey,
          mutationFn: vi.fn(),
        }),
      { wrapper: createWrapper() },
    );

    result.current.onSuccess();

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey });
  });

  it("voidタイプのリクエストを正しく処理する", async () => {
    const mockData = { success: true };
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockData),
    };
    const mockMutationFn = vi.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () =>
        mp<void>({
          queryKey: ["void-test"],
          mutationFn: mockMutationFn,
        }),
      { wrapper: createWrapper() },
    );

    const data = await result.current.mutationFn(undefined);

    expect(mockMutationFn).toHaveBeenCalledWith(undefined);
    expect(data).toEqual(mockData);
  });

  it("リクエストとレスポンスの両方のスキーマで検証を行う", async () => {
    const requestSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });

    const responseSchema = z.object({
      token: z.string(),
      expiresAt: z.string(),
    });

    const validRequest = {
      email: "test@example.com",
      password: "password123",
    };

    const validResponse = {
      token: "jwt-token",
      expiresAt: "2024-12-31T23:59:59Z",
    };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(validResponse),
    };
    const mockMutationFn = vi.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () =>
        mp({
          queryKey: ["auth", "login"],
          mutationFn: mockMutationFn,
          requestSchema,
          responseSchema,
        }),
      { wrapper: createWrapper() },
    );

    const data = await result.current.mutationFn(validRequest);

    expect(mockMutationFn).toHaveBeenCalledWith(validRequest);
    expect(data).toEqual(validResponse);
  });

  it("mutationFnがエラーをスローした場合、エラーが伝播する", async () => {
    const networkError = new Error("Network error");
    const mockMutationFn = vi.fn().mockRejectedValue(networkError);

    const { result } = renderHook(
      () =>
        mp({
          queryKey: ["error-test"],
          mutationFn: mockMutationFn,
        }),
      { wrapper: createWrapper() },
    );

    await expect(result.current.mutationFn(undefined)).rejects.toThrow(
      "Network error",
    );
  });
});
