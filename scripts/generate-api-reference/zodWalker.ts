/**
 * Zod v4 schema を runtime import なしで走査する。
 * schema._zod.def.type を discriminator として扱う。
 */
import type { z } from "zod";

export type Param = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

type ZodDef = {
  type: string;
  innerType?: ZodLike;
  options?: ZodLike[];
  shape?: Record<string, ZodLike>;
  element?: ZodLike;
  in?: ZodLike;
  out?: ZodLike;
  entries?: unknown;
};

type ZodLike = {
  _zod: { def: ZodDef };
  description?: string;
};

function getDef(schema: ZodLike): ZodDef {
  return schema._zod.def;
}

function unwrap(schema: ZodLike): {
  inner: ZodLike;
  required: boolean;
  nullable: boolean;
} {
  let current: ZodLike = schema;
  let required = true;
  let nullable = false;
  while (true) {
    const def = getDef(current);
    if (def.type === "optional") {
      required = false;
      if (!def.innerType) break;
      current = def.innerType;
      continue;
    }
    if (def.type === "nullable") {
      required = false;
      nullable = true;
      if (!def.innerType) break;
      current = def.innerType;
      continue;
    }
    if (def.type === "default") {
      required = false;
      if (!def.innerType) break;
      current = def.innerType;
      continue;
    }
    if (def.type === "pipe") {
      // pipe: in 側 (= 入力スキーマ) を優先
      if (!def.in) break;
      current = def.in;
      continue;
    }
    break;
  }
  return { inner: current, required, nullable };
}

function typeName(schema: ZodLike): string {
  const def = getDef(schema);
  switch (def.type) {
    case "string":
      return "string";
    case "number":
    case "int":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    case "array":
      return def.element ? `${typeName(def.element)}[]` : "unknown[]";
    case "enum": {
      const entries = def.entries as
        | Record<string, string>
        | readonly string[]
        | undefined;
      if (!entries) return "string";
      const values = Array.isArray(entries)
        ? entries
        : Object.values(entries as Record<string, string>);
      return values.map((v) => `"${v}"`).join(" | ");
    }
    case "union": {
      if (!def.options || def.options.length === 0) return "union";
      const types = [...new Set(def.options.map(typeName))];
      return types.length === 1 ? types[0] : types.join(" | ");
    }
    default:
      return def.type;
  }
}

function collectDescription(schema: ZodLike): string {
  let current: ZodLike = schema;
  while (current) {
    if (current.description) return current.description;
    const def = getDef(current);
    if (
      (def.type === "optional" ||
        def.type === "nullable" ||
        def.type === "default") &&
      def.innerType
    ) {
      current = def.innerType;
      continue;
    }
    if (def.type === "pipe" && def.in) {
      current = def.in;
      continue;
    }
    break;
  }
  return "";
}

function appendNullType(type: string, nullable: boolean): string {
  if (!nullable) return type;
  const types = type.split(" | ");
  return types.includes("null") ? type : `${type} | null`;
}

export function schemaToParams(
  schema: z.ZodTypeAny | undefined,
): Param[] | undefined {
  if (!schema) return undefined;
  const typed = schema as unknown as ZodLike;
  const { inner } = unwrap(typed);
  const def = getDef(inner);
  if (def.type !== "object" || !def.shape) {
    throw new Error(
      `schemaToParams: expected object schema at top level, got ${def.type}`,
    );
  }
  return Object.entries(def.shape).map(([name, field]) => {
    const description = collectDescription(field);
    const { inner: unwrappedInner, required, nullable } = unwrap(field);
    return {
      name,
      type: appendNullType(typeName(unwrappedInner), nullable),
      required,
      description,
    };
  });
}
