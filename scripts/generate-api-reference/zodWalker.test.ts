import { describe, expect, it } from "vitest";
import { z } from "zod";

import { schemaToParams } from "./zodWalker";

describe("schemaToParams", () => {
  it("returns undefined for missing schema", () => {
    expect(schemaToParams(undefined)).toBeUndefined();
  });

  it("extracts plain string/number/boolean fields", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      active: z.boolean(),
    });
    const params = schemaToParams(schema);
    expect(params).toEqual([
      { name: "name", type: "string", required: true, description: "" },
      { name: "age", type: "number", required: true, description: "" },
      { name: "active", type: "boolean", required: true, description: "" },
    ]);
  });

  it("marks optional/nullable/default fields as not required", () => {
    const schema = z.object({
      a: z.string().optional(),
      b: z.string().nullable(),
      c: z.string().default("x"),
    });
    const params = schemaToParams(schema);
    expect(
      params?.map((p) => ({
        name: p.name,
        required: p.required,
        type: p.type,
      })),
    ).toEqual([
      { name: "a", required: false, type: "string" },
      { name: "b", required: false, type: "string | null" },
      { name: "c", required: false, type: "string" },
    ]);
  });

  it("propagates description from .describe()", () => {
    const schema = z.object({
      title: z.string().describe("タイトル"),
      memo: z.string().optional().describe("メモ"),
    });
    const params = schemaToParams(schema);
    expect(params).toEqual([
      {
        name: "title",
        type: "string",
        required: true,
        description: "タイトル",
      },
      { name: "memo", type: "string", required: false, description: "メモ" },
    ]);
  });

  it("renders array types with element type", () => {
    const schema = z.object({
      items: z.array(z.string()),
      nums: z.array(z.number()).optional(),
    });
    const params = schemaToParams(schema);
    expect(params?.map((p) => ({ name: p.name, type: p.type }))).toEqual([
      { name: "items", type: "string[]" },
      { name: "nums", type: "number[]" },
    ]);
  });

  it("renders enum as union of literals", () => {
    const schema = z.object({
      kind: z.enum(["a", "b", "c"]),
    });
    const params = schemaToParams(schema);
    expect(params?.[0]?.type).toBe('"a" | "b" | "c"');
  });

  it("renders a string-only union as string", () => {
    const schema = z.object({
      date: z.union([z.iso.date(), z.string().regex(/^\d{4}-\d{2}$/)]),
    });
    const params = schemaToParams(schema);
    expect(params?.[0]?.type).toBe("string");
  });

  it("renders nullable optional fields with null", () => {
    const schema = z.object({
      activityKindId: z.string().uuid().nullable().optional(),
    });
    const params = schemaToParams(schema);
    expect(params?.[0]).toMatchObject({
      name: "activityKindId",
      type: "string | null",
      required: false,
    });
  });

  it("unwraps pipe (coerce) and reports inner type", () => {
    const schema = z.object({
      quantity: z.coerce.number().min(0),
    });
    const params = schemaToParams(schema);
    expect(params?.[0]?.type).toBe("number");
    expect(params?.[0]?.required).toBe(true);
  });

  it("throws on non-object top-level schema", () => {
    expect(() => schemaToParams(z.string() as never)).toThrow(
      /expected object schema at top level/,
    );
    expect(() => schemaToParams(z.array(z.string()) as never)).toThrow(
      /expected object schema at top level/,
    );
  });
});
