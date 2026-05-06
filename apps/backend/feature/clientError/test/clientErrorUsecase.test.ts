import { describe, expect, it, vi } from "vitest";

import {
  type ClientErrorPayload,
  newClientErrorUsecase,
} from "../clientErrorUsecase";

const basePayload: ClientErrorPayload = {
  errorType: "component_error",
  message: "boom",
  userId: "user-1",
  platform: "web",
};

describe("clientErrorUsecase", () => {
  describe("WAE 経路", () => {
    it("入力をそのまま blob に書き込む", async () => {
      const wae = { writeDataPoint: vi.fn() };
      const uc = newClientErrorUsecase(wae, undefined);
      await uc.recordClientError({
        ...basePayload,
        stack: "trace",
        screen: "(tabs)/home",
        appVersion: "1.0.0",
      });
      expect(wae.writeDataPoint).toHaveBeenCalledOnce();
      const call = wae.writeDataPoint.mock.calls[0][0];
      expect(call.blobs).toEqual([
        "component_error",
        "boom",
        "trace",
        "user-1",
        "(tabs)/home",
        "web",
        "1.0.0",
      ]);
      expect(call.indexes).toEqual(["component_error"]);
      expect(call.doubles).toEqual([1]);
    });

    it("optional フィールド未指定はすべて空文字に正規化", async () => {
      const wae = { writeDataPoint: vi.fn() };
      const uc = newClientErrorUsecase(wae, undefined);
      await uc.recordClientError(basePayload);
      const call = wae.writeDataPoint.mock.calls[0][0];
      expect(call.blobs[2]).toBe(""); // stack
      expect(call.blobs[4]).toBe(""); // screen
      expect(call.blobs[6]).toBe(""); // appVersion
    });
  });

  describe("byte clip 防御", () => {
    it("ASCII で MAX_MESSAGE_BYTES (1000) ちょうどは切らない", async () => {
      const wae = { writeDataPoint: vi.fn() };
      const uc = newClientErrorUsecase(wae, undefined);
      const msg = "a".repeat(1000);
      await uc.recordClientError({ ...basePayload, message: msg });
      expect(wae.writeDataPoint.mock.calls[0][0].blobs[1]).toBe(msg);
    });

    it("ASCII で MAX_MESSAGE_BYTES + 1 は切る", async () => {
      const wae = { writeDataPoint: vi.fn() };
      const uc = newClientErrorUsecase(wae, undefined);
      const msg = "a".repeat(1001);
      await uc.recordClientError({ ...basePayload, message: msg });
      expect(wae.writeDataPoint.mock.calls[0][0].blobs[1]).toBe(
        "a".repeat(1000),
      );
    });

    it("CJK (3バイト/字) は UTF-16 length ではなくバイト数で切る", async () => {
      const wae = { writeDataPoint: vi.fn() };
      const uc = newClientErrorUsecase(wae, undefined);
      // "あ" * 500 = 1500 bytes (zod schema の length max=1000 は通過する範囲だが byte 上限超)
      const msg = "あ".repeat(500);
      await uc.recordClientError({ ...basePayload, message: msg });
      const written: string = wae.writeDataPoint.mock.calls[0][0].blobs[1];
      expect(new TextEncoder().encode(written).byteLength).toBeLessThanOrEqual(
        1000,
      );
    });

    it("stack / userId / screen / appVersion も clip 対象", async () => {
      const wae = { writeDataPoint: vi.fn() };
      const uc = newClientErrorUsecase(wae, undefined);
      await uc.recordClientError({
        ...basePayload,
        stack: "x".repeat(5000),
        userId: "u".repeat(100),
        screen: "s".repeat(300),
        appVersion: "v".repeat(100),
      });
      const blobs: string[] = wae.writeDataPoint.mock.calls[0][0].blobs;
      expect(blobs[2].length).toBeLessThanOrEqual(3000);
      expect(blobs[3].length).toBeLessThanOrEqual(64);
      expect(blobs[4].length).toBeLessThanOrEqual(200);
      expect(blobs[6].length).toBeLessThanOrEqual(50);
    });
  });

  describe("WAE 不在経路 (ローカル/テスト)", () => {
    it("logger.info とローカルログに書き込み、WAE は呼ばない", async () => {
      const logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        child: vi.fn(),
      };
      const uc = newClientErrorUsecase(undefined, logger as never);
      await uc.recordClientError(basePayload);
      expect(logger.info).toHaveBeenCalledOnce();
      const args = logger.info.mock.calls[0];
      expect(args[0]).toBe("Client error reported");
      expect(args[1].message).toBe("boom");
    });

    it("logger 未指定でもエラーにならない", async () => {
      const uc = newClientErrorUsecase(undefined, undefined);
      await expect(uc.recordClientError(basePayload)).resolves.toBeUndefined();
    });
  });
});
