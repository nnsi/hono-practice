import { describe, expect, test } from "vitest";

import { createTracer, noopTracer } from "./tracer";

describe("createTracer", () => {
  test("span で async 関数の実行時間を計測できる", async () => {
    const tracer = createTracer();

    const result = await tracer.span("db.findUser", async () => {
      await new Promise((r) => setTimeout(r, 50));
      return "found";
    });

    expect(result).toBe("found");

    const summary = tracer.getSummary();
    expect(summary.dbMs).toBeGreaterThanOrEqual(40);
    expect(summary.spanCount).toBe(1);
  });

  test("span でエラーが発生しても duration が記録される", async () => {
    const tracer = createTracer();

    await expect(
      tracer.span("db.failingQuery", async () => {
        await new Promise((r) => setTimeout(r, 30));
        throw new Error("query failed");
      }),
    ).rejects.toThrow("query failed");

    const summary = tracer.getSummary();
    expect(summary.dbMs).toBeGreaterThanOrEqual(20);
    expect(summary.spanCount).toBe(1);
  });

  test("addSpan で手動記録できる", () => {
    const tracer = createTracer();

    tracer.addSpan("ext.googleVerify", 120);
    tracer.addSpan("ext.webhookCall", 80);

    const summary = tracer.getSummary();
    expect(summary.extMs).toBe(200);
    expect(summary.spanCount).toBe(2);
  });

  test("カテゴリ別に集計される", async () => {
    const tracer = createTracer();

    tracer.addSpan("db.findActivity", 10);
    tracer.addSpan("db.createLog", 15);
    tracer.addSpan("r2.putObject", 50);
    tracer.addSpan("kv.getRateLimit", 5);
    tracer.addSpan("ext.googleVerify", 100);
    tracer.addSpan("other.something", 999);

    const summary = tracer.getSummary();
    expect(summary.dbMs).toBe(25);
    expect(summary.r2Ms).toBe(50);
    expect(summary.kvMs).toBe(5);
    expect(summary.extMs).toBe(100);
    expect(summary.spanCount).toBe(6);
  });
});

describe("noopTracer", () => {
  test("関数を実行するが計測しない", async () => {
    const result = await noopTracer.span("db.test", async () => "value");
    expect(result).toBe("value");

    const summary = noopTracer.getSummary();
    expect(summary.dbMs).toBe(0);
    expect(summary.spanCount).toBe(0);
  });
});
