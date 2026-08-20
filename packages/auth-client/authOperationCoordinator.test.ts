import { describe, expect, it, vi } from "vitest";

import { newAuthOperationCoordinator } from "./authOperationCoordinator";

describe("newAuthOperationCoordinator", () => {
  it("session operation 中に始まった refresh を後ろへ直列化する", async () => {
    let resolveLogin!: () => void;
    const loginGate = new Promise<void>((resolve) => {
      resolveLogin = resolve;
    });
    const runRefresh = vi.fn(async () => "refreshed");
    const coordinator = newAuthOperationCoordinator(runRefresh);
    const order: string[] = [];

    const login = coordinator.runSessionOperation(async () => {
      order.push("login:start");
      await loginGate;
      order.push("login:end");
      return "logged-in";
    });
    const refresh = coordinator.refreshSession();
    await Promise.resolve();

    expect(runRefresh).not.toHaveBeenCalled();
    resolveLogin();
    await Promise.all([login, refresh]);

    expect(order).toEqual(["login:start", "login:end"]);
    expect(runRefresh).toHaveBeenCalledOnce();
  });

  it("同時 refresh は単一の operation を共有する", async () => {
    const runRefresh = vi.fn(async () => "refreshed");
    const coordinator = newAuthOperationCoordinator(runRefresh);

    const [first, second] = await Promise.all([
      coordinator.refreshSession(),
      coordinator.refreshSession(),
    ]);

    expect(first).toBe("refreshed");
    expect(second).toBe("refreshed");
    expect(runRefresh).toHaveBeenCalledOnce();
  });
});
