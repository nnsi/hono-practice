import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mobileOnlineRetryAdapter } from "./mobileOnlineRetryAdapter";

const subscribe = vi.mocked(NetInfo.addEventListener);
let notify: (state: NetInfoState) => void;
const unsubscribe = vi.fn();

function state(isConnected: boolean | null): NetInfoState {
  return { isConnected } as NetInfoState;
}

beforeEach(() => {
  vi.clearAllMocks();
  subscribe.mockImplementation((handler) => {
    notify = handler;
    handler(state(true));
    return unsubscribe;
  });
});

describe("mobile online retry adapter", () => {
  it("登録直後の connected や unknown から connected への通知では再試行しない", () => {
    const retry = vi.fn();
    const cleanup = mobileOnlineRetryAdapter.registerOnlineRetry(retry);
    notify(state(true));
    notify(state(null));
    notify(state(true));

    expect(retry).not.toHaveBeenCalled();
    cleanup();
  });

  it("disconnected を観測した後の connected で一度だけ再試行する", () => {
    const retry = vi.fn();
    const cleanup = mobileOnlineRetryAdapter.registerOnlineRetry(retry);
    notify(state(false));
    notify(state(null));
    notify(state(true));
    notify(state(true));

    expect(retry).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("初回 disconnected から connected に戻った場合も再試行する", () => {
    subscribe.mockImplementationOnce((handler) => {
      notify = handler;
      handler(state(false));
      return unsubscribe;
    });
    const retry = vi.fn();
    const cleanup = mobileOnlineRetryAdapter.registerOnlineRetry(retry);
    notify(state(true));

    expect(retry).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("cleanup は購読を解除し、遅れて届いた通知も無視する", () => {
    const retry = vi.fn();
    const cleanup = mobileOnlineRetryAdapter.registerOnlineRetry(retry);
    notify(state(false));
    cleanup();
    notify(state(true));

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(retry).not.toHaveBeenCalled();
  });
});
