import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDeleteUser = vi.hoisted(() => vi.fn());

vi.mock("../../utils/apiClient", () => ({
  adminClient: {
    admin: {
      users: {
        ":id": {
          $delete: mockDeleteUser,
        },
      },
    },
  },
}));

import { UserDangerZone } from "./UserDangerZone";

function renderUserDangerZone(onDeleted = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

  render(
    <QueryClientProvider client={queryClient}>
      <UserDangerZone
        userId="user-1"
        loginId="login-id-1"
        onDeleted={onDeleted}
      />
    </QueryClientProvider>,
  );

  return { invalidateQueriesSpy, onDeleted };
}

describe("UserDangerZone", () => {
  beforeEach(() => {
    mockDeleteUser.mockReset();
  });

  it("requires the exact login ID before enabling deletion and completes the flow", async () => {
    mockDeleteUser.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const { invalidateQueriesSpy, onDeleted } = renderUserDangerZone();

    fireEvent.click(screen.getByRole("button", { name: "ユーザーを物理削除" }));

    const input = screen.getByPlaceholderText("ログインID");
    const deleteButton = screen.getByRole("button", {
      name: "削除を実行",
    }) as HTMLButtonElement;

    expect(deleteButton.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "wrong-id" } });
    expect(deleteButton.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "login-id-1" } });
    expect(deleteButton.disabled).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByPlaceholderText("ログインID")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "ユーザーを物理削除" }));
    fireEvent.change(screen.getByPlaceholderText("ログインID"), {
      target: { value: "login-id-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "削除を実行" }));

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledTimes(1);
    });

    expect(mockDeleteUser).toHaveBeenCalledWith({
      param: { id: "user-1" },
      json: { loginIdConfirmation: "login-id-1" },
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["admin", "users"],
    });
  });
});
