import { QueryFunction } from "@tanstack/react-query";
import { ZodSchema } from "zod";

export function queryFnFunc<T>(
  requestFn: () => Promise<Response>,
  schema: ZodSchema<T>
): QueryFunction<T> {
  return async () => {
    const res = await requestFn();

    if (res.status !== 200) {
      const json = await res.json().catch(() => null);
      const message = json?.message || res.statusText;
      console.error(`Error ${res.status}: ${message}`);
      throw new Error(message);
    }

    const json = await res.json();
    const parsedResult = schema.safeParse(json);
    if (!parsedResult.success) {
      console.error("Validation error:", parsedResult.error);
      throw parsedResult.error;
    }

    return parsedResult.data;
  };
}
