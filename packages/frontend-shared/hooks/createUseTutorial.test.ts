import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type TutorialAdapter,
  type TutorialStatus,
  createUseTutorial,
} from "./createUseTutorial";

// useCallback is the only React dep used by createUseTutorial
const reactStub = {
  useCallback: <T extends (...args: never[]) => unknown>(
    cb: T,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _deps: readonly unknown[],
  ): T => cb,
};

function makeAdapter(status: TutorialStatus): TutorialAdapter & {
  persistStatus: ReturnType<typeof vi.fn>;
} {
  return {
    useStatus: () => status,
    persistStatus: vi.fn().mockResolvedValue(undefined),
  };
}

describe("createUseTutorial", () => {
  describe("isOpen の計算", () => {
    it('status === "pending" のとき isOpen === true', () => {
      const adapter = makeAdapter("pending");
      const useTutorial = createUseTutorial({ react: reactStub, adapter });
      const { result } = renderHook(() => useTutorial());
      expect(result.current.isOpen).toBe(true);
    });

    it('status === "done" のとき isOpen === false', () => {
      const adapter = makeAdapter("done");
      const useTutorial = createUseTutorial({ react: reactStub, adapter });
      const { result } = renderHook(() => useTutorial());
      expect(result.current.isOpen).toBe(false);
    });

    it("status === null のとき isOpen === false", () => {
      const adapter = makeAdapter(null);
      const useTutorial = createUseTutorial({ react: reactStub, adapter });
      const { result } = renderHook(() => useTutorial());
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe("status の反映", () => {
    it("useStatus の戻り値がそのまま status に反映される", () => {
      const adapter = makeAdapter("pending");
      const useTutorial = createUseTutorial({ react: reactStub, adapter });
      const { result } = renderHook(() => useTutorial());
      expect(result.current.status).toBe("pending");
    });

    it("rerender 時に useStatus の戻り値が変化すれば status も更新される", () => {
      let currentStatus: TutorialStatus = "pending";
      const adapter: TutorialAdapter = {
        useStatus: () => currentStatus,
        persistStatus: vi.fn().mockResolvedValue(undefined),
      };
      const useTutorial = createUseTutorial({ react: reactStub, adapter });
      const { result, rerender } = renderHook(() => useTutorial());

      expect(result.current.status).toBe("pending");
      expect(result.current.isOpen).toBe(true);

      currentStatus = "done";
      rerender();

      expect(result.current.status).toBe("done");
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe("complete()", () => {
    it('adapter.persistStatus("done") を呼ぶ', async () => {
      const adapter = makeAdapter("pending");
      const useTutorial = createUseTutorial({ react: reactStub, adapter });
      const { result } = renderHook(() => useTutorial());

      await result.current.complete();

      expect(adapter.persistStatus).toHaveBeenCalledTimes(1);
      expect(adapter.persistStatus).toHaveBeenCalledWith("done");
    });
  });

  describe("skip()", () => {
    it('adapter.persistStatus("done") を呼ぶ', async () => {
      const adapter = makeAdapter("pending");
      const useTutorial = createUseTutorial({ react: reactStub, adapter });
      const { result } = renderHook(() => useTutorial());

      await result.current.skip();

      expect(adapter.persistStatus).toHaveBeenCalledTimes(1);
      expect(adapter.persistStatus).toHaveBeenCalledWith("done");
    });
  });

  describe("complete() と skip() は独立して呼べる", () => {
    it("complete() と skip() が両方とも persistStatus を呼ぶ", async () => {
      const adapter = makeAdapter("pending");
      const useTutorial = createUseTutorial({ react: reactStub, adapter });
      const { result } = renderHook(() => useTutorial());

      await result.current.complete();
      await result.current.skip();

      expect(adapter.persistStatus).toHaveBeenCalledTimes(2);
      expect(adapter.persistStatus).toHaveBeenNthCalledWith(1, "done");
      expect(adapter.persistStatus).toHaveBeenNthCalledWith(2, "done");
    });
  });
});
