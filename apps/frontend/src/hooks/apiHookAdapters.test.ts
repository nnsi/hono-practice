import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createUseApiKeys: vi.fn(),
  createUseCreateApiKey: vi.fn(),
  createUseDeleteApiKey: vi.fn(),
  createUseSubscription: vi.fn(),
  getApiKeys: vi.fn(),
  postApiKey: vi.fn(),
  deleteApiKey: vi.fn(),
  getSubscription: vi.fn(),
}));

vi.mock("@packages/frontend-shared/hooks/useApiKeys", () => ({
  createUseApiKeys: mocks.createUseApiKeys,
  createUseCreateApiKey: mocks.createUseCreateApiKey,
  createUseDeleteApiKey: mocks.createUseDeleteApiKey,
}));

vi.mock("@packages/frontend-shared/hooks/useSubscription", () => ({
  createUseSubscription: mocks.createUseSubscription,
}));

vi.mock("../utils/apiClient", () => ({
  apiClient: {
    users: {
      "api-keys": {
        $get: mocks.getApiKeys,
        $post: mocks.postApiKey,
        ":id": {
          $delete: mocks.deleteApiKey,
        },
      },
      subscription: {
        $get: mocks.getSubscription,
      },
    },
  },
}));

import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "./useApiKeys";
import { useSubscription } from "./useSubscription";

function createResponse(ok: boolean, json: unknown) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(json),
  };
}

describe("frontend API hook adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards API key wrappers and handles error branches", async () => {
    useApiKeys({ enabled: false });
    const queryOptions = mocks.createUseApiKeys.mock.calls[0][0];

    expect(queryOptions.enabled).toBe(false);

    mocks.getApiKeys.mockResolvedValueOnce(
      createResponse(true, { apiKeys: [] }),
    );
    await expect(queryOptions.fetchApiKeys()).resolves.toEqual({ apiKeys: [] });
    expect(mocks.getApiKeys).toHaveBeenCalledTimes(1);

    mocks.getApiKeys.mockResolvedValueOnce(createResponse(false, {}));
    await expect(queryOptions.fetchApiKeys()).rejects.toThrow(
      "Failed to fetch API keys",
    );

    useCreateApiKey();
    const createOptions = mocks.createUseCreateApiKey.mock.calls[0][0];
    const input = { name: "CLI Key", scopes: ["all"] };

    mocks.postApiKey.mockResolvedValueOnce(
      createResponse(true, { id: "key-1" }),
    );
    await expect(createOptions.createApiKey(input)).resolves.toEqual({
      id: "key-1",
    });
    expect(mocks.postApiKey).toHaveBeenCalledWith({ json: input });

    mocks.postApiKey.mockResolvedValueOnce(createResponse(false, {}));
    await expect(createOptions.createApiKey(input)).rejects.toThrow(
      "Failed to create API key",
    );

    useDeleteApiKey();
    const deleteOptions = mocks.createUseDeleteApiKey.mock.calls[0][0];

    mocks.deleteApiKey.mockResolvedValueOnce(
      createResponse(true, { success: true }),
    );
    await expect(deleteOptions.deleteApiKey("key-1")).resolves.toEqual({
      success: true,
    });
    expect(mocks.deleteApiKey).toHaveBeenCalledWith({
      param: { id: "key-1" },
    });

    mocks.deleteApiKey.mockResolvedValueOnce(createResponse(false, {}));
    await expect(deleteOptions.deleteApiKey("key-1")).rejects.toThrow(
      "Failed to delete API key",
    );
  });

  it("forwards subscription wrapper and handles error branches", async () => {
    useSubscription();
    const queryOptions = mocks.createUseSubscription.mock.calls[0][0];

    mocks.getSubscription.mockResolvedValueOnce(
      createResponse(true, { plan: "premium" }),
    );
    await expect(queryOptions.fetchSubscription()).resolves.toEqual({
      plan: "premium",
    });
    expect(mocks.getSubscription).toHaveBeenCalledTimes(1);

    mocks.getSubscription.mockResolvedValueOnce(createResponse(false, {}));
    await expect(queryOptions.fetchSubscription()).rejects.toThrow(
      "Failed to fetch subscription",
    );
  });
});
