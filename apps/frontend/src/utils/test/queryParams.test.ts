import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { qp } from "../queryParams";

describe("qp (queryParams)", () => {
  const mockSchema = z.object({
    id: z.string(),
    name: z.string(),
    count: z.number(),
  });

  const createMockQueryContext = (queryKey: readonly unknown[]) => ({
    client: new QueryClient(),
    queryKey,
    signal: new AbortController().signal,
    meta: undefined,
  });

  type MockData = z.infer<typeof mockSchema>;

  it("正しいクエリオプションオブジェクトを返す", () => {
    const queryKey = ["test", "data"];
    const queryFn = vi.fn();

    const result = qp({
      queryKey,
      queryFn,
      schema: mockSchema,
    });

    expect(result.queryKey).toEqual(queryKey);
    expect(typeof result.queryFn).toBe("function");
    expect(result.queryFn).not.toBe(queryFn); // ラップされた関数であることを確認
  });

  it("queryFnがレスポンスを正しくパースする", async () => {
    const mockData: MockData = {
      id: "123",
      name: "Test Item",
      count: 42,
    };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockData),
    };

    const queryFn = vi.fn().mockResolvedValue(mockResponse);

    const result = qp({
      queryKey: ["test"],
      queryFn,
      schema: mockSchema,
    });

    const queryFnProp = result.queryFn;
    const data =
      typeof queryFnProp === "function"
        ? await queryFnProp(createMockQueryContext(["test"]))
        : undefined;

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(mockResponse.json).toHaveBeenCalledTimes(1);
    expect(data).toEqual(mockData);
  });

  it("スキーマ検証が失敗した場合にエラーをスローする", async () => {
    const invalidData = {
      id: "123",
      name: "Test Item",
      count: "not a number", // 無効なデータ
    };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(invalidData),
    };

    const queryFn = vi.fn().mockResolvedValue(mockResponse);

    const result = qp({
      queryKey: ["test"],
      queryFn,
      schema: mockSchema,
    });

    const queryFnProp = result.queryFn;
    if (typeof queryFnProp === "function") {
      await expect(
        queryFnProp(createMockQueryContext(["test"])),
      ).rejects.toThrow();
    }
  });

  it("複雑なスキーマでも正しく動作する", async () => {
    const complexSchema = z.object({
      user: z.object({
        id: z.string(),
        profile: z.object({
          name: z.string(),
          age: z.number().min(0).max(150),
        }),
      }),
      posts: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          published: z.boolean(),
        }),
      ),
    });

    const validData = {
      user: {
        id: "user-123",
        profile: {
          name: "John Doe",
          age: 30,
        },
      },
      posts: [
        { id: "post-1", title: "First Post", published: true },
        { id: "post-2", title: "Second Post", published: false },
      ],
    };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(validData),
    };

    const queryFn = vi.fn().mockResolvedValue(mockResponse);

    const result = qp({
      queryKey: ["complex", "data"],
      queryFn,
      schema: complexSchema,
    });

    const queryFnProp = result.queryFn;
    const data =
      typeof queryFnProp === "function"
        ? await queryFnProp(createMockQueryContext(["complex", "data"]))
        : undefined;
    expect(data).toEqual(validData);
  });

  it("空のレスポンスの場合も適切に処理する", async () => {
    const emptySchema = z.object({});

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    };

    const queryFn = vi.fn().mockResolvedValue(mockResponse);

    const result = qp({
      queryKey: ["empty"],
      queryFn,
      schema: emptySchema,
    });

    const queryFnProp = result.queryFn;
    const data =
      typeof queryFnProp === "function"
        ? await queryFnProp(createMockQueryContext(["empty"]))
        : undefined;
    expect(data).toEqual({});
  });

  it("配列スキーマで正しく動作する", async () => {
    const arraySchema = z.array(
      z.object({
        id: z.string(),
        value: z.number(),
      }),
    );

    const arrayData = [
      { id: "1", value: 10 },
      { id: "2", value: 20 },
      { id: "3", value: 30 },
    ];

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(arrayData),
    };

    const queryFn = vi.fn().mockResolvedValue(mockResponse);

    const result = qp({
      queryKey: ["array", "data"],
      queryFn,
      schema: arraySchema,
    });

    const queryFnProp = result.queryFn;
    const data =
      typeof queryFnProp === "function"
        ? await queryFnProp(createMockQueryContext(["array", "data"]))
        : undefined;
    expect(data).toEqual(arrayData);
  });

  it("Zodのカスタムエラーメッセージが保持される", async () => {
    const strictSchema = z.object({
      email: z.string().email("Invalid email format"),
      age: z.number().min(18, "Must be at least 18 years old"),
    });

    const invalidData = {
      email: "not-an-email",
      age: 16,
    };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(invalidData),
    };

    const queryFn = vi.fn().mockResolvedValue(mockResponse);

    const result = qp({
      queryKey: ["strict"],
      queryFn,
      schema: strictSchema,
    });

    try {
      const queryFnProp = result.queryFn;
      if (typeof queryFnProp === "function") {
        await queryFnProp(createMockQueryContext(["strict"]));
      }
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.issues).toBeDefined();
      expect(
        error.issues.some((e: any) =>
          e.message.includes("Invalid email format"),
        ),
      ).toBe(true);
      expect(
        error.issues.some((e: any) =>
          e.message.includes("Must be at least 18 years old"),
        ),
      ).toBe(true);
    }
  });

  it("queryFnがエラーをスローした場合、そのエラーが伝播する", async () => {
    const networkError = new Error("Network error");
    const queryFn = vi.fn().mockRejectedValue(networkError);

    const result = qp({
      queryKey: ["error"],
      queryFn,
      schema: mockSchema,
    });

    const queryFnProp = result.queryFn;
    if (typeof queryFnProp === "function") {
      await expect(
        queryFnProp(createMockQueryContext(["error"])),
      ).rejects.toThrow("Network error");
    }
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
